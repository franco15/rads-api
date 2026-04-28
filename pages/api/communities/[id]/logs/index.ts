import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus } from "@/lib/interfaces";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getLogs(req, res);
		// case "POST":
		// 	break;
		// case "PUT":
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function getLogs(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { id } = req.query;
		const logs = await prisma.communityLog.findMany({
			where: {
				communityId: id as string,
			},
			orderBy: {
				createdAt: "desc",
			},
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
					},
				},
			},
		});

		return res.status(200).json(logs);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/communities/logs",
				method: req.method ?? "GET",
			},
		});
		return res.status(500).json({ message: error.message });
	}
}
