import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/createNotification";
import { NotificationType } from "@/lib/interfaces";
import { sendToSingelUser } from "@/lib/pushNotifications";
import pusher from "@/lib/pusher";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return createTalk(req, res);
		case "PUT":
			return editTalk(req, res);
		case "DELETE":
			return removeTalk(req, res);
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function createTalk(req: NextApiRequest, res: NextApiResponse) {
	try {
		const body = req.body;
		const socket_id = body.socket_id as string;
		const talk = body.talk;
		const uc = await prisma.userCommunity.findUnique({
			where: {
				id: talk.senderId,
			},
			include: {
				user: {
					select: {
						createdAt: true,
						firstName: true,
						lastName: true,
					},
				},
				community: {
					select: {
						name: true,
					},
				},
			},
		});
		const newTalk = await prisma.talk.create({
			data: talk,
			include: {
				receiver: {
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								image: true,
							},
						},
					},
				},
				sender: {
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								image: true,
							},
						},
					},
				},
			},
		});
		const notification = await createNotification(
			prisma,
			newTalk.receiver.user.id,
			`${uc?.user.firstName} ${uc?.user.lastName} of ${uc?.community.name} sent you a talk`,
			NotificationType.Talk
		);
		await sendToSingelUser(newTalk.receiver.user.id, {
			notification: {
				title: "Pending talk!",
				body: `${uc?.user.firstName} ${uc?.user.lastName} of ${uc?.community.name} sent you a talk`,
				sound: "default",
			},
		});
		if (socket_id) {
			await pusher.trigger(newTalk.receiver.user.id, "new-talk", newTalk, {
				socket_id,
			});
			await pusher.trigger(
				newTalk.receiver.user.id,
				"add-notification",
				notification,
				{
					socket_id,
				}
			);
		}
		return res.status(201).json(newTalk);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}

async function editTalk(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.query;
		const { description, socket_id } = req.body;
		const talk = await prisma.talk.update({
			where: {
				id: id as string,
			},
			data: {
				description: description,
			},
			include: {
				receiver: {
					select: {
						userId: true,
					},
				},
			},
		});
		if (!talk) return res.status(404).json({ message: "talk not found" });
		if (socket_id) {
			await pusher.trigger(
				talk.receiver.userId,
				"edit-talk",
				{
					id: talk.id,
					description: talk.description,
				},
				{ socket_id }
			);
		}
		return res.status(200).json({ talk });
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}

async function removeTalk(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.query;
		const body = req.body;
		const socket_id = body.socket_id as string;
		const talk = await prisma.talk.update({
			where: {
				id: id as string,
			},
			data: {
				drank: true,
			},
			include: {
				receiver: {
					select: {
						userId: true,
					},
				},
			},
		});
		if (!talk) return res.status(404).json({ message: "talk not found" });
		if (socket_id) {
			await pusher.trigger(
				talk.receiver.userId,
				"remove-talk",
				{
					id: talk.id,
				},
				{ socket_id }
			);
		}

		return res.status(200).json({ message: "talk done" });
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
