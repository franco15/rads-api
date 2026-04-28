import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// return getTalks(req, res);
		// case "POST":
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

// async function getTalks(req: NextApiRequest, res: NextApiResponse<Data>) {
// 	try {
// 		const { id } = req.query;

// 		const talks = await prisma.coffee.findMany({
// 			where: {
// 				guestId: id as string,
// 				drank: false,
// 			},
// 			select: {
// 				id: true,
// 				createdAt: true,
// 				description: true,
// 				drank: true,
// 				host: {
// 					select: {
// 						id: true,
// 						firstName: true,
// 						lastName: true,
// 						image: true,
// 					},
// 				},
// 			},
// 		});
// 		return res.status(200).json(talks);
// 	} catch (error: any) {
// 		return res.status(500).json({ message: error.message });
// 	}
// }
