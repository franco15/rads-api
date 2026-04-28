import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	return res.status(400).json({ message: "method not allowed" });
	// try {
	// 	const people = await prisma.person.findMany();
	// 	await prisma.$transaction(
	// 		people.map((person) => {
	// 			return prisma.person.updateMany({
	// 				data: {
	// 					recognitions: 0,
	// 				},
	// 			});
	// 		})
	// 	);
	// 	return res.status(200).json({ message: "field added successfully" });
	// } catch (error: any) {
	// 	return res.status(500).json({ message: error.message });
	// }
};

export default withAuth(handler);
