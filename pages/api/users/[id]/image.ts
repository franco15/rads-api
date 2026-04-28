import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (
	req: NextApiRequest,
	res: NextApiResponse<Data | null>
) => {
	switch (req.method) {
		case "PUT":
			return updateImage(req, res);
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function updateImage(
	req: NextApiRequest,
	res: NextApiResponse<Data | null>
) {
	try {
		const { id } = req.query;
		const { image } = req.body;
		const user = await prisma.user.update({
			where: {
				id: id as string,
			},
			data: {
				image: image,
			},
		});
		if (!user) return res.status(404).json({ message: "user not found" });
		return res.status(200).json({ message: "user image updated." });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
