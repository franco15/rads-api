import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus } from "@/lib/interfaces";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getInfo(req, res);
		// case "POST":
		// 	break;
		// case "PUT":
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function getInfo(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { id } = req.query;
		const community = await prisma.community.findUnique({
			where: {
				id: id as string,
			},
			include: {
				members: {
					include: {
						user: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								image: true,
							},
						},
					},
				},
			},
		});
		if (!community)
			return res.status(404).json({ message: "community not found" });
		const numberOfCycles = await prisma.cycle.count({
			where: {
				communityId: community.id,
				OR: [{ status: CycleStatus.Current }, { status: CycleStatus.Done }],
			},
		});
		const userCommunities = await prisma.userCommunity.findMany({
			where: {
				communityId: community.id,
			},
			select: {
				rads: true,
			},
		});
		const totalRads = userCommunities
			.map((x) => x.rads)
			.reduce((acc, curr) => acc + curr, 0);

		return res
			.status(200)
			.json({ members: community.members, numberOfCycles, totalRads });
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/communities/[id]/members",
				method: req.method ?? "GET",
			},
		});
		return res.status(500).json({ message: error.message });
	}
}
