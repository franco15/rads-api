import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getRecognition(req, res);
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

async function getRecognition(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { id } = req.query;
		const recognition = await prisma.recognition.findUnique({
			where: {
				id: id as string,
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
		if (!recognition)
			return res.status(404).json({ message: "recognition not found" });
		return res.status(200).json(recognition);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
