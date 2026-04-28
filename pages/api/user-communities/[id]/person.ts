import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	return getPerson(req, res);
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

// async function getPerson(req: NextApiRequest, res: NextApiResponse<Data>) {
// 	try {
// 		const { id, firstPersonId, thirdPersonId } = req.query;
// 		const person = await prisma.person.findFirst({
// 			where: {
// 				userCommunityId: id as string,
// 				firstPersonId: firstPersonId as string,
// 				thirdPersonId: thirdPersonId as string,
// 			},
// 			include: {
// 				thirdPerson: {
// 					select: {
// 						id: true,
// 						firstName: true,
// 						lastName: true,
// 						image: true,
// 					},
// 				},
// 			},
// 		});

// 		if (!person) return res.status(404).json({ message: "person not found" });
// 		return res.status(200).json(person);
// 	} catch (error: any) {
// 		return res.status(500).json({ message: error.message });
// 	}
// }
