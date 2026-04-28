import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { VoteStatus } from "@/lib/interfaces";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return createVote(req, res);
		// case "PUT":
		// 	break;
		// case "DELETE":
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function createVote(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { id } = req.query;
		const body = req.body;
		const userId: string = body.userId;
		const vote: boolean = body.vote;
		if (userId === undefined || vote === undefined)
			return res.status(400).json({ message: "user id or vote not provided" });
		const castedVoted = await prisma.vote.create({
			data: {
				voteStatus: vote ? VoteStatus.Yes : VoteStatus.No,
				pollId: id as string,
				userId: userId,
			},
		});
		return res.status(200).json(castedVoted);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
