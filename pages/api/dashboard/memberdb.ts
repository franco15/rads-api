import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus, EmotionType } from "@/lib/interfaces";
import { Months } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getDashboard(req, res);
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

async function getDashboard(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const id = req.query.id as string;

		const userCommunity = await prisma.userCommunity.findUnique({
			where: {
				id: id,
			},
			include: {
				community: true,
				user: {
					select: {
						firstName: true,
						lastName: true,
						image: true,
					},
				},
			},
		});

		if (!userCommunity)
			return res.status(404).json({ message: "community not found" });

		const cycles = await prisma.cycle.findMany({
			where: {
				communityId: userCommunity.communityId,
				startDate: { gt: userCommunity.createdAt },
				// status: CycleStatus.Done,
			},
		});
		// const cyclesAlive = cycles.filter(
		// 	(x) => userCommunity.createdAt < x.startDate
		// ).length;
		const currentCycle = cycles.find((x) => x.status === CycleStatus.Current)!;
		const lastCycle = cycles.find((x) => x.status === CycleStatus.Done)!;

		const recognitions = await prisma.recognition.findMany({
			where: {
				OR: [{ senderId: id }, { receiverId: id }],
			},
		});

		const recognitionsSent = recognitions.filter((x) => x.senderId === id);
		const recognitionsSentPerCycle = cycles
			.filter(
				(x) => x.status === CycleStatus.Done || x.status === CycleStatus.Current
			)
			.map((cycle) => {
				const recsInCycle = recognitionsSent.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				);
				const month = Months[cycle.endDate.getMonth()];
				return {
					recognitions: recsInCycle.length,
					month,
				};
			});
		const mostRecognitionsSentToGrouped = recognitionsSent.reduce(
			(acc: Record<string, number>, rec) => {
				acc[rec.receiverId] = (acc[rec.receiverId] || 0) + 1;
				return acc;
			},
			{}
		);

		const mostRecognitionsSentTo = await Promise.all(
			Object.entries(mostRecognitionsSentToGrouped)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 1)
				.map(async (rec) => {
					const person = await prisma.userCommunity.findUnique({
						where: {
							id: rec[0],
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
						recognitions: rec[1],
					};
				})
		);

		const recognitionsReceived = recognitions.filter(
			(x) => x.receiverId === id
		);
		const recognitionsReceivedPerCycle = cycles
			.filter(
				(x) => x.status === CycleStatus.Done || x.status === CycleStatus.Current
			)
			.map((cycle) => {
				const recsInCycle = recognitionsReceived.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				);
				const month = Months[cycle.endDate.getMonth()];
				return {
					recognitions: recsInCycle.length,
					month,
				};
			});
		const mostRecognitionsReceivedToGrouped = recognitionsReceived.reduce(
			(acc: Record<string, number>, rec) => {
				acc[rec.senderId] = (acc[rec.senderId] || 0) + 1;
				return acc;
			},
			{}
		);

		const mostRecognitionsReceivedFrom = await Promise.all(
			Object.entries(mostRecognitionsReceivedToGrouped)
				.sort((a, b) => b[1] - a[1])
				.slice(0, 1)
				.map(async (rec) => {
					const person = await prisma.userCommunity.findUnique({
						where: {
							id: rec[0],
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
						recognitions: rec[1],
					};
				})
		);

		const rads = await prisma.rad.findMany({
			where: {
				OR: [{ senderId: id }, { receiverId: id }],
			},
		});

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

		const radsSent = rads.filter((x) => x.senderId === id);
		const radsSentPerCycle = cycles
			.filter((x) => x.status === CycleStatus.Done)
			.map((cycle) => {
				const radsInCycle = radsSent.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				);
				const month = Months[cycle.endDate.getMonth()];
				return {
					rads: radsInCycle.length,
					month,
				};
			});

		const radsReceived = rads.filter((x) => x.receiverId === id);
		const radsReceivedPerCycle = cycles
			.filter((x) => x.status === CycleStatus.Done)
			.map((cycle) => {
				const radsInCycle = radsReceived.filter(
					(x) => x.createdAt > cycle.startDate && x.createdAt < cycle.endDate
				);
				const month = Months[cycle.endDate.getMonth()];
				return {
					rads: radsInCycle.length,
					month,
				};
			});

		const lastMessages = await prisma.recognition.findMany({
			where: {
				OR: [{ senderId: id }, { receiverId: id }],
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
				communityId: userCommunity.communityId,
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

		const allRecognitions = await prisma.recognition.findMany({
			where: {
				OR: [
					{ sender: { communityId: userCommunity.communityId } },
					{ receiver: { communityId: userCommunity.communityId } },
				],
			},
		});

		const radsPerPerson = userCommunities
			.map((uc) => {
				const emotions = allRecognitions
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
		const avgRads =
			radsPerPerson.map((x) => x.rads).reduce((acc, val) => acc + val, 0) /
			radsPerPerson.length;
		const totalRads = userCommunity.rads;

		const recognitionsSentPerPerson = allRecognitions.reduce(
			(acc: Record<string, number>, rec) => {
				acc[rec.senderId] = (acc[rec.senderId] || 0) + 1;
				return acc;
			},
			{}
		);
		const recognitionsReceivedPerPerson = allRecognitions.reduce(
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

		const emotions: EmotionType[] = recognitions
			.filter(
				(x) =>
					x.createdAt > currentCycle.startDate &&
					x.createdAt < currentCycle.endDate
			)
			.map((x) => x.emotion);
		const emotionsGrouped = emotions.reduce((acc, emotion) => {
			if (!acc[emotion]) {
				acc[emotion] = 0;
			}
			acc[emotion]++;
			return acc;
		}, {} as Record<EmotionType, number>);
		const lastCycleEmotions: EmotionType[] = recognitions
			.filter(
				(x) =>
					x.createdAt > lastCycle.startDate && x.createdAt < lastCycle.endDate
			)
			.map((x) => x.emotion);
		const lastCycleEmotionsGrouped = Object.entries(
			lastCycleEmotions.reduce((acc, emotion) => {
				if (!acc[emotion]) {
					acc[emotion] = 0;
				}
				acc[emotion]++;
				return acc;
			}, {} as Record<EmotionType, number>)
		).map((x) => {
			return {
				emotion: x[0],
				total: x[1],
			};
		});

		const stats = {
			totalRads,
			avgRads,
			radsAboveAvg: totalRads - avgRads > 0,
			recognitionsReceived: recognitionsReceived.filter(
				(x) =>
					x.createdAt > currentCycle.startDate &&
					x.createdAt < currentCycle.endDate
			).length,
			avgRecognitionsReceived: avgRecsReceived,
			recognitionsReceivedAboveAvg:
				recognitionsReceived.filter(
					(x) =>
						x.createdAt > currentCycle.startDate &&
						x.createdAt < currentCycle.endDate
				).length -
					avgRecsReceived >
				0,
			recognitionsSent: recognitionsSent.filter(
				(x) =>
					x.createdAt > currentCycle.startDate &&
					x.createdAt < currentCycle.endDate
			).length,
			avgRecognitionsSent: avgRecsSent,
			recognitionsSentAboveAvg:
				recognitionsSent.filter(
					(x) =>
						x.createdAt > currentCycle.startDate &&
						x.createdAt < currentCycle.endDate
				).length -
					avgRecsSent >
				0,
			emotions: Object.entries(emotionsGrouped).map((x) => {
				const lastEmotion = lastCycleEmotionsGrouped.find(
					(y) => x[0] === y.emotion
				);
				return {
					emotion: x[0],
					total: x[1],
					difference: lastEmotion ? x[1] - lastEmotion.total : x[1],
				};
			}),
		};

		const dashboard = {
			user: {
				name: userCommunity.user.firstName + " " + userCommunity.user.lastName,
				image: userCommunity.user.image,
			},
			cyclesAlive: cycles.filter(
				(x) => x.status === CycleStatus.Done || x.status === CycleStatus.Current
			).length,
			community: {
				name: userCommunity.community.name,
				image: userCommunity.community.image,
			},
			recognitionsSentPerCycle,
			recognitionsReceivedPerCycle,
			radsPerCycle,
			radsSentPerCycle,
			radsReceivedPerCycle,
			lastMessages,
			radsPerPerson,
			mostRecognitionsSentTo: mostRecognitionsSentTo[0],
			mostRecognitionsReceivedFrom: mostRecognitionsReceivedFrom[0],
			stats,
		};
		return res.status(200).json(dashboard);
	} catch (error: any) {
		return res.status(500).json({ error: error.message });
	}
}
