import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getNotifications(req, res);
		// case "POST":
		// 	break;
		// case "PUT":
		// 	break;
		// case "DELETE":
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function getNotifications(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { userId, skip, take } = req.query;
		let skipInt = parseInt(skip as string);
		let takeInt = parseInt(take as string);
		if (!skipInt) skipInt = 0;
		if (!takeInt) takeInt = 10;
		const limit = skipInt > 0 ? skipInt * takeInt : takeInt;
		const date = new Date();
		date.setMonth(date.getMonth() - 1);
		const notifications = await prisma.notification.findMany({
			orderBy: {
				createdAt: "desc",
			},
			where: {
				userId: userId as string,
				createdAt: { gt: date },
			},
			skip: skipInt,
			take: limit,
		});
		return res.status(200).json(notifications);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
