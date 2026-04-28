import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getRecognitions(req, res);
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

async function getRecognitions(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const { id } = req.query;
		const recognitions = await prisma.recognition.findMany({
			where: {
				receiver: {
					userId: id as string,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			include: {
				sender: {
					select: {
						user: {
							select: {
								firstName: true,
								lastName: true,
								image: true,
							},
						},
						community: {
							select: {
								name: true,
								image: true,
							},
						},
					},
				},
			},
		});
		return res.status(200).json(recognitions);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
