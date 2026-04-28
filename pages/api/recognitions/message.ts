import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/createNotification";
import { IRecognitionMessage, NotificationType } from "@/lib/interfaces";
import { sendToSingelUser } from "@/lib/pushNotifications";
import pusher from "@/lib/pusher";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return createRecognition(req, res);
		// case 'PUT':
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function createRecognition(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const body = req.body;
		const rec = body.recognition as IRecognitionMessage;
		const socket_id = body.socket_id as string;
		rec.note = rec.note.trim();
		const newRecognition = await prisma.recognition.create({
			data: {
				note: rec.note,
				senderId: rec.senderId,
				receiverId: rec.receiverId,
				emotion: rec.emotionType,
			},
			include: {
				sender: {
					select: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								image: true,
							},
						},
						community: {
							select: {
								name: true,
								image: true,
							},
						},
					},
				},
				receiver: {
					select: {
						userId: true,
					},
				},
			},
		});
		const notification = await createNotification(
			prisma,
			newRecognition.receiver.userId,
			`${newRecognition.sender.user.firstName} ${newRecognition.sender.user.lastName} of ${newRecognition.sender.community.name} gave you a recognition!`,
			NotificationType.Recognition,
			rec.emotionType.toString()
		);

		await sendToSingelUser(newRecognition.receiver.userId, {
			title: "New recognition!",
			body: `${newRecognition.sender.user.firstName} ${newRecognition.sender.user.lastName} of ${newRecognition.sender.community.name} gave you a recognition!`,
			sound: "default",
		});

		if (socket_id) {
			await pusher.trigger(
				newRecognition.receiver.userId,
				"new-recognition",
				newRecognition,
				{
					socket_id,
				}
			);
			await pusher.trigger(
				newRecognition.receiver.userId,
				"add-notification",
				notification,
				{
					socket_id,
				}
			);
		}
		return res.status(201).json(newRecognition);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/recognitions/message",
				method: req.method ?? "POST",
			},
		});

		return res.status(500).json({ message: error.message });
	}
}
