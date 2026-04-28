import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getUserCommunity(req, res);
		// case 'POST':
		// 	break;
		// case 'PUT':
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function getUserCommunity(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const { id, community } = req.query;
		const userCommunity = await prisma.userCommunity.findFirst({
			where: {
				userId: id as string,
				communityId: community as string,
				active: true,
			},
			select: {
				id: true,
				rads: true,
				community: {
					select: {
						id: true,
						name: true,
						description: true,
						image: true,
						total: true,
					},
				},
			},
		});
		if (!userCommunity)
			return res.status(404).json({ message: "user is not in the community" });
		return res.status(200).json(userCommunity);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
