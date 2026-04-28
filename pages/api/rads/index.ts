import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { IRads } from "@/lib/interfaces";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return sendRads(req, res);
		// case "PUT":
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function sendRads(req: NextApiRequest, res: NextApiResponse) {
	try {
		const body = req.body;
		const radsArray = body.rads as IRads[];
		await prisma.$transaction(
			radsArray.map((rads) => {
				return prisma.rad.create({
					data: {
						rads: rads.rads,
						senderId: rads.senderId,
						receiverId: rads.receiverId,
					},
				});
			}) as any
		);
		return res
			.status(200)
			.json({ status: 200, message: "rads update successfully" });
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/rads/update-rads",
				method: req.method ?? "PUT",
			},
		});

		return res.status(500).json({ message: error.message });
	}
}
