import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		// case "POST":
		// 	break;
		// case "PUT":
		// 	return sendBalance(req, res);
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

// async function sendBalance(req: NextApiRequest, res: NextApiResponse) {
// 	try {
// 		const { id } = req.query;
// 		if (!id) return res.status(401).json({ message: "user id is missing" });
// 		const people = await prisma.person.findMany({
// 			where: {
// 				firstPersonId: id as string,
// 			},
// 		});
// 		await prisma.$transaction(
// 			people.map((person) => {
// 				return prisma.person.update({
// 					where: {
// 						id: person.id,
// 					},
// 					data: {
// 						totalRads: { increment: person.cycleRads },
// 						cycleRads: 0,
// 					},
// 				});
// 			})
// 		);
// 		await prisma.cycle.update({
// 			where: {
// 				userId: id as string,
// 			},
// 			data: {
// 				closed: true,
// 				daysLeft: 0,
// 				radsLeft: 0,
// 				radsGiven: 0,
// 			},
// 		});
// 		return res.status(200).json({ message: "balance sent successfully" });
// 	} catch (error: any) {
// 		return res.status(500).json({ error: error.message });
// 	}
// }
