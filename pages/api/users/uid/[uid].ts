import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus } from "@/lib/interfaces";
import { addDays } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getUserByUid(req, res);
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

async function getUserByUid(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { uid } = req.query;
		const date = new Date();
		date.setMonth(date.getMonth() - 1);
		const user: any = await prisma.user.findUnique({
			where: {
				uid: uid as string,
			},
			include: {
				// quitarlos para nomas traerlos cuando entre a la pantalla
				notifications: {
					orderBy: { createdAt: "desc" },
					where: { createdAt: { gt: date } },
				},
				userCommunities: {
					where: {
						active: true,
					},
					select: {
						id: true,
						rads: true,
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
												uid: true,
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
								cycle: {
									take: 1,
									where: {
										status: CycleStatus.Current,
									},
									select: {
										rads: true,
										duration: true,
										status: true,
										startDate: true,
										endDate: true,
									},
								},
								polls: {
									where: { ongoing: true },
									select: {
										id: true,
										createdAt: true,
										keyToChange: true,
										oldValue: true,
										newValue: true,
										description: true,
										startDate: true,
										endDate: true,
										communityId: true,
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
						recognitionsSent: {
							orderBy: {
								createdAt: "desc",
							},
							take: 3,
							include: {
								receiver: {
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
				},
				invitesReceived: {
					select: {
						joined: true,
						code: true,
					},
				},
				invitesSent: {
					where: { joined: false },
					select: {
						inviteeId: true,
						communityId: true,
					},
				},
			},
		});
		if (!user) return res.status(404).json({ message: "user not found" });

		const currentCycle = await prisma.cycle.findFirst({
			where: {
				status: CycleStatus.Current,
			},
		});
		if (user.userCommunities) {
			for (let i = 0; i < user?.userCommunities.length; i++) {
				if (currentCycle) {
					const recognitionsInCycle = await prisma.recognition.findMany({
						where: {
							AND: [
								{
									OR: [
										{
											sender: {
												communityId: user.userCommunities[i].communityId,
											},
										},
										{
											receiver: {
												communityId: user.userCommunities[i].communityId,
											},
										},
									],
								},
								{
									AND: [
										{ createdAt: { gte: currentCycle.startDate } },
										{ createdAt: { lt: currentCycle.endDate } },
									],
								},
							],
						},
					});
					const today = new Date();
					today.setHours(0, 0, 0, 0);
					const tomorrow = addDays(1, today);
					const recognitionsToday = await prisma.recognition.findMany({
						where: {
							AND: [
								{
									OR: [
										{
											sender: {
												communityId: user.userCommunities[i].communityId,
											},
										},
										{
											receiver: {
												communityId: user.userCommunities[i].communityId,
											},
										},
									],
								},
								{
									AND: [
										{ createdAt: { gte: today } },
										{ createdAt: { lt: tomorrow } },
									],
								},
							],
						},
					});
					const emotionMostUsed = recognitionsInCycle.map((x) => x.emotion);
					const emotionsReduced = emotionMostUsed.reduce(
						(acc: Record<number, number>, num) => {
							acc[num] = (acc[num] || 0) + 1;
							return acc;
						},
						{}
					);
					const info = {
						totalRecognitions: recognitionsInCycle.length,
						totalRecognitionsToday: recognitionsToday.length,
						emotionMostUsed: Object.entries(emotionsReduced).reduce(
							(
								highest: [number | null, number],
								[num, count]: [string, number]
							) => {
								const parsedNum = parseInt(num);
								return count > highest[1] ||
									(count === highest[1] && parsedNum > highest[0]!)
									? [parsedNum, count]
									: highest;
							},
							[null, 0]
						)[0],
					};
					user.userCommunities[i].recognitionsInfo = info;
				} else {
					user.userCommunities[i].recognitionsInfo = {
						totalRecognitions: 0,
						totalRecognitionsToday: 0,
						emotionMostUsed: null,
					};
				}

				user.userCommunities[i].community.cycle = {
					...user.userCommunities[i].community.cycle[0],
				};
			}
		}
		return res.status(200).json(user);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
