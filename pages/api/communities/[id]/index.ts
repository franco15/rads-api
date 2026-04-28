import type { NextApiRequest, NextApiResponse } from "next";
import { nanoid } from "nanoid";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus, ICommunity, NotificationType } from "@/lib/interfaces";
import { createNotification } from "@/lib/createNotification";
import { sendToSingelUser } from "@/lib/pushNotifications";
import pusher from "@/lib/pusher";
import { getCycleDates, getDaysDifference } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getCommunity(req, res);
		case "POST":
			return inviteToCommunity(req, res);
		case "PUT":
			return editCommunity(req, res);
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function getCommunity(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { id } = req.query;

		const community = await prisma.community.findUnique({
			where: {
				id: id as string,
			},
		});
		if (!community)
			return res.status(404).json({ message: "community not found" });

		return res.status(200).json(community);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/communities/[id]",
				method: req.method ?? "GET",
			},
		});
		return res.status(500).json({ message: error.message });
	}
}

async function inviteToCommunity(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const { id } = req.query;
		const body = req.body;
		const socket_id = body.socket_id as string;

		const inviteModel = {
			code: nanoid(8),
			inviterId: body.inviterId,
			inviteeId: body.inviteeId,
			communityId: id as string,
		};

		const invite = await prisma.invite.create({
			data: inviteModel,
			include: {
				community: {
					select: {
						name: true,
					},
				},
				inviter: {
					select: {
						firstName: true,
						lastName: true,
					},
				},
			},
		});

		const notification = await createNotification(
			prisma,
			body.inviteeId,
			`${invite.inviter.firstName} ${invite.inviter.lastName} is inviting you to join the ${invite.community.name} community.`,
			NotificationType.Invite,
			invite.code
		);

		if (socket_id)
			await pusher.trigger(body.inviteeId, "add-notification", notification, {
				socket_id,
			});

		await sendToSingelUser(body.inviteeId, {
			notification: {
				title: `New invite to ${invite.community.name}`,
				body: `${invite.inviter.firstName} ${invite.inviter.lastName} is inviting you to join the ${invite.community.name} community.`,
				sound: "default",
			},
		});

		return res.status(200).json(invite);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/communities/[id]",
				method: req.method ?? "POST",
			},
		});
		return res.status(500).json({ message: error.message });
	}
}

async function editCommunity(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const body = req.body;
		const community = body.community as ICommunity;
		const socket_id = body.socket_id as string;
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
						status: CycleStatus.Current,
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
