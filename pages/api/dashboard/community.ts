import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus, EmotionType, IRecognition } from "@/lib/interfaces";
import { getDaysDifference, Months } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getCommunityDashboard(req, res);
		// case "OPTIONS":
		// 	return res.status(200);
		// case "POST":
		// 	break;
		// case "PUT":
		// 	break;
		// case "DELETE":
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);
// export default handler;

async function getCommunityDashboard(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const uid = req.query.id as string;

		const adminUser = await prisma.adminUser.findFirst({
			where: {
				uid: uid,
			},
		});
		if (!adminUser) return res.status(404).json({ message: "user not found" });

		const id = adminUser.communityId;
		const community = await prisma.community.findUnique({
			where: {
				id: id,
			},
		});
		if (!community)
			return res.status(404).json({ message: "community not found" });
		const cycles = await prisma.cycle.findMany({
			where: {
				communityId: id,
				status: { not: CycleStatus.Next },
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const currentCycle = cycles.find((x) => x.status === CycleStatus.Current)!;
		const lastCycle = cycles.find((x) => x.status === CycleStatus.Done)!;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const daysLeftInCycle = getDaysDifference(
			today,
			new Date(currentCycle!.endDate)
		);

		const rads = await prisma.rad.findMany({
			where: {
				OR: [
					{ sender: { communityId: id } },
					{ receiver: { communityId: id } },
				],
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		const currentCycleRads = rads.filter(
			(x) => x.createdAt > currentCycle.startDate
		);
		const lastCycleRads = rads.filter(
			(x) =>
				x.createdAt > lastCycle.startDate && x.createdAt < lastCycle.endDate
		);

		const recognitions = await prisma.recognition.findMany({
			where: {
				OR: [
					{ sender: { communityId: id } },
					{ receiver: { communityId: id } },
				],
			},
		});
		const lastCycleRecognitions = recognitions.filter(
			(x) =>
				x.createdAt > lastCycle.startDate && x.createdAt < lastCycle.endDate
		);

		const recognitionsPerCycle = cycles
			.reverse()
			.filter((x) => x.status === CycleStatus.Done || CycleStatus.Current)
			.map((cycle) => {
				const recsInCycle = recognitions.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				);
				const month = Months[cycle.endDate.getMonth()];
				return {
					recognitions: recsInCycle.length,
					month,
				};
			});

		const currentCycleRecognitions = recognitions.filter(
			(x) => x.createdAt > currentCycle.startDate
		);

		const recognitionsSentPerPerson = recognitions.reduce(
			(acc: Record<string, number>, rec) => {
				acc[rec.senderId] = (acc[rec.senderId] || 0) + 1;
				return acc;
			},
			{}
		);
		const recognitionsReceivedPerPerson = recognitions.reduce(
			(acc: Record<string, number>, rec) => {
				acc[rec.receiverId] = (acc[rec.receiverId] || 0) + 1;
				return acc;
			},
			{}
		);

		const avgRecsSent =
			Object.entries(recognitionsSentPerPerson).reduce(
				(sum, curr) => sum + curr[1],
				0
			) / Object.entries(recognitionsSentPerPerson).length;
		const avgRecsReceived =
			Object.entries(recognitionsReceivedPerPerson).reduce(
				(sum, curr) => sum + curr[1],
				0
			) / Object.entries(recognitionsReceivedPerPerson).length;

		const radsPerCycle = cycles
			.filter((x) => x.status === CycleStatus.Done)
			.map((cycle) => {
				const radsInCycle = rads.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				);
				const month = Months[cycle.endDate.getMonth()];
				return {
					rads: radsInCycle.length,
					month,
				};
			});

		const mostRecognitionsSent = await Promise.all(
			Object.entries(recognitionsSentPerPerson)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(async (recognitions) => {
					const person = await prisma.userCommunity.findUnique({
						where: {
							id: recognitions[0],
						},
						select: {
							user: {
								select: {
									image: true,
								},
							},
						},
					});
					return {
						userImage: person?.user.image.trim() ?? null,
						recognitions: recognitions[1],
					};
				})
		);
		const mostRecognitionsReceived = await Promise.all(
			Object.entries(recognitionsReceivedPerPerson)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 3)
				.map(async (recognitions) => {
					const person = await prisma.userCommunity.findUnique({
						where: {
							id: recognitions[0],
						},
						select: {
							user: {
								select: {
									image: true,
								},
							},
						},
					});
					return {
						userImage: person?.user.image.trim() ?? null,
						recognitions: recognitions[1],
					};
				})
		);

		const lastMessages = await prisma.recognition.findMany({
			where: {
				OR: [
					{ sender: { communityId: id } },
					{ receiver: { communityId: id } },
				],
			},
			orderBy: {
				createdAt: "desc",
			},
			take: 3,
			include: {
				sender: {
					select: {
						user: {
							select: {
								image: true,
							},
						},
					},
				},
				receiver: {
					select: {
						user: {
							select: {
								image: true,
							},
						},
					},
				},
			},
		});

		const userCommunities = await prisma.userCommunity.findMany({
			where: {
				communityId: id,
			},
			include: {
				user: {
					select: {
						firstName: true,
						lastName: true,
						image: true,
					},
				},
			},
		});

		const radsPerPerson = userCommunities
			.map((uc) => {
				const emotions = recognitions
					.filter((x) => x.senderId === uc.id)
					.map((x) => x.emotion);
				const emotionsMap: Record<number, number> = {};
				let max = 0;
				let mostRepeating = 0;
				emotions.forEach((x) => {
					emotionsMap[x] = (emotionsMap[x] || 0) + 1;
					if (emotionsMap[x] > max) {
						max = emotionsMap[x];
						mostRepeating = x;
					}
				});
				return {
					name: `${uc.user.firstName} ${uc.user.lastName}`,
					image: uc.user.image,
					rads: uc.rads,
					emotion: mostRepeating,
					id: uc.id,
				};
			})
			.sort((a, b) => b.rads - a.rads);

		const cycleEmotions = cycles.reverse().map((cycle, index) => {
			const emotions: EmotionType[] = recognitions
				.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				)
				.map((x) => x.emotion);
			const emotionsGrouped = emotions.reduce((acc, emotion) => {
				if (!acc[emotion]) {
					acc[emotion] = 0;
				}
				acc[emotion]++;
				return acc;
			}, {} as Record<EmotionType, number>);
			const month = Months[cycle.startDate.getMonth()];
			return {
				id: index,
				month,
				emotions: Object.entries(emotionsGrouped).map((x) => {
					return {
						emotion: x[0],
						total: x[1],
					};
				}),
			};
		});

		const dashboard = {
			community,
			totals: {
				rads: {
					currentCycle: currentCycleRads.length,
					lastCycle: lastCycleRads.length,
					total: rads.length,
				},
				recognitions: {
					total: currentCycleRecognitions.length,
					lastCycle: lastCycleRecognitions.length,
				},
				cycles: {
					total: cycles.length,
					daysLeft: daysLeftInCycle,
				},
			},
			recognitionsPerCycle,
			averageRecognitionsSent: avgRecsSent,
			averageRecognitionsReceived: avgRecsReceived,
			radsPerCycle,
			mostRecognitionsSent,
			mostRecognitionsReceived,
			lastMessages,
			radsPerPerson,
			cycleEmotions,
		};
		return res.status(200).json(dashboard);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
