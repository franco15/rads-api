import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/createNotification";
import { IRecognition, NotificationType } from "@/lib/interfaces";
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
		const rec = body.recognition as IRecognition;
		const sendRecognition = await prisma.rad.create({
			data: {
				rads: rec.total,
				senderId: rec.senderId,
				receiverId: rec.receiverId,
			},
		});

		return res.status(200).json({ status: 200, message: "recognitions sent" });
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/recognitions",
				method: req.method ?? "POST",
			},
		});

		return res.status(500).json({ message: error.message });
	}
}
