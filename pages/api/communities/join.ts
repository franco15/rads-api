import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import pusher from "@/lib/pusher";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	break;
		case "POST":
			return joinCommunity(req, res);
		// case "PUT":
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function joinCommunity(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const body = req.body;
		const socket_id = body.socket_id as string;
		const radical = req.query.radical;
		const communityId =
			radical !== "true" ? body.communityId : process.env.RADICAL_COMMUNITY;
		const userId = body.userId;
		if (!communityId || communityId === "" || !userId || userId === "")
			return res.status(400).json({ message: "Wrong parameters" });
		// check if user already in community
		const alreadyIn = await prisma.userCommunity.findFirst({
			where: {
				userId,
				communityId,
			},
			include: {
				community: true,
			},
		});

		if (alreadyIn) {
			if (!alreadyIn.active) {
				const userCommunity: any = await prisma.userCommunity.update({
					where: { id: alreadyIn.id },
					data: { active: true },
					select: {
						id: true,
						rads: true,
						communityId: true,
						community: {
							include: {
								members: {
									where: {
										active: true,
									},
									select: {
										id: true,
										userId: true,
										user: {
											select: {
												id: true,
												firstName: true,
												lastName: true,
												image: true,
											},
										},
										communityId: true,
										community: {
											select: {
												id: true,
												name: true,
												image: true,
											},
										},
									},
								},
							},
						},
						talksSent: {
							where: {
								drank: false,
							},
							orderBy: {
								createdAt: "desc",
							},
							include: {
								receiver: {
									include: {
										user: {
											select: {
												id: true,
												firstName: true,
												lastName: true,
												image: true,
											},
										},
										community: {
											select: {
												id: true,
												name: true,
												image: true,
											},
										},
									},
								},
							},
						},
						talksReceived: {
							where: {
								drank: false,
							},
							orderBy: {
								createdAt: "desc",
							},
							include: {
								sender: {
									include: {
										user: {
											select: {
												id: true,
												firstName: true,
												lastName: true,
												image: true,
											},
										},
										community: {
											select: {
												id: true,
												name: true,
												image: true,
											},
										},
									},
								},
							},
						},
						radsReceived: {
							include: {
								sender: {
									include: {
										user: {
											select: {
												id: true,
												firstName: true,
												lastName: true,
												image: true,
											},
										},
										community: {
											select: {
												id: true,
												name: true,
												image: true,
											},
										},
									},
								},
							},
						},
						recognitionsReceived: {
							orderBy: {
								createdAt: "desc",
							},
							take: 3,
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
						},
					},
				});

				await prisma.community.update({
					where: { id: communityId },
					data: {
						total: { increment: 1 },
					},
				});

				if (socket_id) {
					await pusher.trigger(
						userCommunity!.communityId,
						"new-in-community",
						userCommunity,
						{ socket_id }
					);
				}

				return res.status(200).json(userCommunity!);
			}
			return res.status(409).json({ message: "User already in community" });
		}

		const userCommunity: any = await prisma.userCommunity.create({
			data: {
				userId,
				communityId,
			},
			select: {
				id: true,
				rads: true,
				communityId: true,
				community: {
					include: {
						members: {
							where: {
								active: true,
							},
							select: {
								id: true,
								userId: true,
								user: {
									select: {
										id: true,
										firstName: true,
										lastName: true,
										image: true,
									},
								},
								communityId: true,
								community: {
									select: {
										id: true,
										name: true,
										image: true,
									},
								},
							},
						},
					},
				},
			},
		});

		userCommunity.talksSent = [];
		userCommunity.talksReceived = [];
		userCommunity.radsReceived = [];
		userCommunity.recognitionsReceived = [];
		userCommunity.recognitionsSent = [];

		// increment by one the total users of said community
		await prisma.community.update({
			where: { id: communityId },
			data: {
				total: { increment: 1 },
			},
		});

		if (socket_id) {
			await pusher.trigger(
				userCommunity!.communityId,
				"new-in-community",
				userCommunity,
				{
					socket_id,
				}
			);
		}

		return res.status(200).json(userCommunity!);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
