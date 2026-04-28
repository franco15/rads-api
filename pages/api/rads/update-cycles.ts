import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { CycleStatus, ICycle } from "@/lib/interfaces";
import { getCycleDates } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return updateBalance(req, res);
		// case "PUT":
		// 	break;
		// return updateCycles(req, res);
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default handler;

async function updateBalance(req: NextApiRequest, res: NextApiResponse) {
	try {
		const today = new Date();
		const cycles = await prisma.cycle.findMany({
			where: {
				status: CycleStatus.Current,
				endDate: {
					lt: today,
				},
			},
			include: {
				community: {
					include: {
						members: {
							include: {
								radsSent: {
									where: {
										sent: false,
									},
									include: {
										receiver: true,
									},
								},
								user: true,
							},
						},
					},
				},
			},
		});
		cycles.forEach(async (cycle) => {
			const totalRadsInCommunity = cycle.community.total * cycle.rads;
			const members = cycle.community.members;

			// get total number of recognitios sent in the community this cycle
			const totalRadsSent = members.reduce(
				(x, y) => x + y.radsSent.reduce((a, b) => a + b.rads, 0),
				0
			);
			members.forEach(async (member) => {
				const radsByMember = Object.values(
					member.radsSent.reduce<{
						[receiverId: string]: { rads: number; receiverId: string };
					}>((acc, obj) => {
						const { receiverId, rads } = obj;
						if (acc[receiverId]) acc[receiverId].rads += rads;
						else acc[receiverId] = { rads, receiverId };
						return acc;
					}, {})
				);

				radsByMember.forEach(async (member) => {
					// (recognitions sent to a person in community / total recognitions sent in the community this cycle) * totalRadsInCommunity
					const rads = (member.rads / totalRadsSent) * totalRadsInCommunity;
					await prisma.userCommunity.update({
						where: { id: member.receiverId },
						data: {
							rads: { increment: rads },
							radsReceived: {
								updateMany: {
									where: {
										AND: {
											receiverId: member.receiverId,
											sent: false,
										},
									},
									data: {
										sent: true,
									},
								},
							},
							user: {
								update: {
									rads: { increment: rads },
								},
							},
						},
					});
				});
			});
		});
		const cyclesCommunityId: string[] = [];
		cycles.forEach(async (cycle) => {
			cyclesCommunityId.push(cycle.communityId);
			await prisma.cycle.update({
				where: {
					id: cycle.id,
				},
				data: {
					status: CycleStatus.Done,
				},
			});
		});

		const nextCylces = await prisma.cycle.findMany({
			where: {
				status: CycleStatus.Next,
				communityId: { in: cyclesCommunityId },
			},
		});

		nextCylces.forEach(async (nextCylce) => {
			await prisma.cycle.update({
				where: {
					id: nextCylce.id,
				},
				data: {
					status: CycleStatus.Current,
				},
			});
		});

		nextCylces.forEach(async (nextCycle) => {
			const startDate = nextCycle.endDate;
			const dates = getCycleDates(startDate, nextCycle.duration);
			await prisma.cycle.create({
				data: {
					startDate: dates.startDate,
					endDate: dates.endDate,
					rads: nextCycle.rads,
					duration: nextCycle.duration,
					status: CycleStatus.Next,
					communityId: nextCycle.communityId,
				},
			});
		});

		return res.status(200).json({ message: "balances updated successfully" });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
