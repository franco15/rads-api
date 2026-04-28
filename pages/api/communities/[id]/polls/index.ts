import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getPolls(req, res);
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

async function getPolls(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.query;

		const polls = await prisma.poll.findMany({
			where: {
				communityId: id as string,
			},
			include: {
				votes: {
					select: {
						id: true,
						createdAt: true,
						voteStatus: true,
						userId: true,
						user: {
							select: {
								firstName: true,
								lastName: true,
								image: true,
							},
						},
					},
				},
			},
		});
		return res.status(200).json(polls);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
