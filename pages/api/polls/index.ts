import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { IPollViewModel, VoteStatus } from "@/lib/interfaces";
import { addDays } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return createPoll(req, res);
		// case "PUT":
		// 	break;
		// case "DELETE":
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function createPoll(req: NextApiRequest, res: NextApiResponse) {
	try {
		const body = req.body;
		const poll = body.poll as IPollViewModel;

		const startDate = new Date();
		startDate.setHours(0, 0, 0, 0);
		const endDate = addDays(7, startDate);
		const newPoll = await prisma.poll.create({
			data: {
				description: poll.description,
				startDate,
				endDate,
				communityId: poll.communityId,
				keyToChange: poll.key,
				oldValue: poll.oldValue,
				newValue: poll.newValue,
			},
			include: {
				community: {
					select: {
						id: true,
						name: true,
						image: true,
					},
				},
			},
		});
		const newVote = await prisma.vote.create({
			data: {
				voteStatus: VoteStatus.Yes,
				pollId: newPoll.id,
				userId: poll.userId,
			},
		});
		return res.status(200).json(newPoll);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
