import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { getCycleDates, getDaysDifference } from "@/lib/utils";
import pusher from "@/lib/pusher";
import {
	ChangeType,
	CycleDuration,
	CycleStatus,
	ICommunity,
} from "@/lib/interfaces";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getCommunities(req, res);
		case "POST":
			return createCommunity(req, res);
		case "PUT":
			return editCommunity(req, res);
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function getCommunities(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { skip, take } = req.query;
		let skipInt = parseInt(skip as string);
		let takeInt = parseInt(take as string);
		if (!skipInt) skipInt = 0;
		if (!takeInt) takeInt = 10;
		takeInt = skipInt > 0 ? skipInt * takeInt : takeInt;
		const communities: any = await prisma.community.findMany({
			// skip: skipInt,
			// take: takeInt,
			orderBy: {
				createdAt: "desc",
			},
			include: {
				members: {
					where: {
						active: true,
					},
					take: 5,
					select: {
						user: {
							select: {
								image: true,
							},
						},
					},
				},
				cycle: {
					take: 1,
					where: {
						status: CycleStatus.Current,
					},
					select: {
						duration: true,
						startDate: true,
						endDate: true,
					},
				},
			},
		});
		communities.forEach(async (community: any) => {
			community.cycle = { ...community.cycle[0] };
		});
		return res.status(200).json(communities);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function createCommunity(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const body = req.body;
		const community = body.community as ICommunity;
		const userId = body.userId;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dates = getCycleDates(today, community.cycle.duration);
		const rads = getDaysDifference(dates.startDate, dates.endDate);
		const newCommunity = await prisma.community.create({
			data: {
				name: community.name,
				description: community.description,
				// image is empty, this is just to create it with the property
				image: "",
				total: 1,
				cycle: {
					create: {
						startDate: dates.startDate,
						endDate: dates.endDate,
						rads: rads,
						duration: community.cycle.duration,
						status: CycleStatus.Current,
					},
				},
			},
			include: {
				cycle: {
					where: {
						status: CycleStatus.Current,
					},
				},
			},
		});
		const currentCycle = newCommunity.cycle.find(
			(x) => x.status === CycleStatus.Current
		);
		const nextStart = currentCycle!.endDate;
		const nextDates = getCycleDates(nextStart, currentCycle!.duration);
		const nextCycle = await prisma.cycle.create({
			data: {
				startDate: nextDates.startDate,
				endDate: nextDates.endDate,
				rads: currentCycle!.rads,
				duration: currentCycle!.duration,
				status: CycleStatus.Next,
				communityId: newCommunity.id,
			},
		});
		const userCommunity: any = await prisma.userCommunity.create({
			data: {
				userId: userId,
				communityId: newCommunity.id,
			},
			include: {
				community: true,
			},
		});

		userCommunity.talksSent = [];
		userCommunity.talksReceived = [];
		userCommunity.radsReceived = [];
		userCommunity.recognitionsReceived = [];
		userCommunity.recognitionsSent = [];
		userCommunity.community.cycle = [newCommunity.cycle, nextCycle];

		return res.status(200).json(userCommunity);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function editCommunity(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const body = req.body;
		const community = body.community as ICommunity;
		const socket_id = body.socket_id as string;
		const userId = body.userId as string;
		const oldCommunity = await prisma.community.findUnique({
			where: {
				id: community.id,
			},
			include: {
				cycle: {
					where: {
						status: CycleStatus.Next,
					},
				},
			},
		});
		if (!oldCommunity)
			return res.status(404).json({ message: "community not found" });
		const updatedCommunity = await prisma.community.update({
			where: {
				id: community.id,
			},
			data: {
				name: community.name,
				description: community.description,
				image: community.image,
			},
			include: {
				cycle: {
					where: {
						OR: [{ status: CycleStatus.Current }, { status: CycleStatus.Next }],
					},
				},
			},
		});
		let nextCycle = await prisma.cycle.findFirst({
			where: {
				communityId: community.id,
				status: CycleStatus.Next,
			},
		});
		const currentCycle = updatedCommunity.cycle.find(
			(x) => x.status === CycleStatus.Current
		);
		const dates = getCycleDates(
			currentCycle!.endDate,
			community.cycle.duration
		);
		const rads = getDaysDifference(dates.startDate, dates.endDate);

		nextCycle = await prisma.cycle.update({
			where: {
				id: nextCycle?.id,
			},
			data: {
				rads: rads,
				startDate: dates.startDate,
				endDate: dates.endDate,
				duration: community.cycle.duration,
			},
		});
		updatedCommunity.cycle.push(nextCycle);
		if (!updatedCommunity)
			return res.status(404).json({ message: "community not found" });
		if (oldCommunity.name !== updatedCommunity.name) {
			await prisma.communityLog.create({
				data: {
					oldValue: oldCommunity.name,
					newValue: updatedCommunity.name,
					communityId: updatedCommunity.id,
					userId: userId,
					type: ChangeType.Name,
				},
			});
		}
		if (oldCommunity.description !== updatedCommunity.description) {
			await prisma.communityLog.create({
				data: {
					oldValue: oldCommunity.description,
					newValue: updatedCommunity.description,
					communityId: updatedCommunity.id,
					userId: userId,
					type: ChangeType.Description,
				},
			});
		}
		if (oldCommunity.image !== updatedCommunity.image) {
			await prisma.communityLog.create({
				data: {
					oldValue: oldCommunity.image,
					newValue: updatedCommunity.image,
					communityId: updatedCommunity.id,
					userId: userId,
					type: ChangeType.Image,
				},
			});
		}
		if (oldCommunity.cycle[0].duration !== nextCycle.duration) {
			await prisma.communityLog.create({
				data: {
					oldValue: oldCommunity.cycle[0].duration.toString(),
					newValue: updatedCommunity.cycle[0].duration.toString(),
					communityId: updatedCommunity.id,
					userId: userId,
					type: ChangeType.CycleDuration,
				},
			});
		}
		if (socket_id)
			await pusher.trigger(
				updatedCommunity.id,
				"update-community",
				updatedCommunity,
				{
					socket_id,
				}
			);
		return res.status(200).json(updatedCommunity);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
