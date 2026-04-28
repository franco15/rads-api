import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { auth, storageBucket } from "@/lib/firebase-admin";
import httpService from "@/lib/httpService";

type Data = {};

const handler = async (
	req: NextApiRequest,
	res: NextApiResponse<Data | null>
) => {
	switch (req.method) {
		case "GET":
			return checkUser(req, res);
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function checkUser(
	req: NextApiRequest,
	res: NextApiResponse<Data | null>
) {
	try {
		const { id } = req.query;
		const user = await prisma.user.findUnique({
			where: {
				id: id as string,
			},
		});

		return res.status(200).json({ exists: user ? true : false });
	} catch (error) {}
}
