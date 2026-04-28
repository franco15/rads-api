import type { NextApiRequest, NextApiResponse } from "next";
import { userApiAuth, withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return createFeedback(req, res);
		case "PUT":
		// 	break;
		case "DELETE":
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function createFeedback(req: NextApiRequest, res: NextApiResponse) {
	try {
		const body = req.body;
		const fbmodel = {
			description: body.description,
			userId: body.userId,
			report: body.report,
			userCommunityId: body.userCommunityId,
		};

		const newFeedback = await prisma.feedback.create({
			data: fbmodel,
		});
		return res.status(201).json(newFeedback);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
