import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return createOrUpdateDevice(req, res);
		// case "PUT":
		// 	break;
		// case "DELETE":
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function createOrUpdateDevice(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const body = req.body;
		let device = await prisma.userDevice.findFirst({
			where: {
				deviceId: body.deviceId,
				// fcmToken: body.expiredToken ?? body.token ?? "",
				// userId: body.userId
			},
		});
		if (device) {
			device = await prisma.userDevice.update({
				where: {
					id: device.id,
				},
				data: {
					userId: body.userId,
					fcmToken: body.token,
					deviceId: body.deviceId,
				},
			});
			return res.status(201).json(device);
		}
		device = await prisma.userDevice.create({
			data: {
				userId: body.userId,
				fcmToken: body.token,
				deviceId: body.deviceId,
			},
		});
		return res.status(201).json(device);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/notifications/device",
				method: req.method ?? "POST",
			},
		});
		return res.status(500).json({ error: error.message });
	}
}
