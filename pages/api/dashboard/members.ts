import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getMembers(req, res);
		// case "OPTIONS":
		// 	return res.status(200);
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
// export default handler;

async function getMembers(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const id = req.query.id as string;

		const userCommunities = await prisma.userCommunity.findMany({
			where: {
				communityId: id,
			},
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
						image: true,
					},
				},
			},
		});

		const members = userCommunities.map((x) => {
			return {
				id: x.id,
				name: `${x.user.firstName} ${x.user.lastName}`,
				image: x.user.image,
			};
		});
		return res.status(200).json(members);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
