import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { CycleStatus, EmotionType } from "@/lib/interfaces";
import { getDaysDifference } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			return getDashboard(req, res);
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

async function getDashboard(req: NextApiRequest, res: NextApiResponse) {
	try {
		const query = req.query;
		const userId = query.id as string;
		const communityId = query.community as string;
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (!userId || !communityId)
			return res.status(404).json({ message: "user or community not found" });
		const userCommunity = await prisma.userCommunity.findFirst({
			where: {
				userId: userId,
				communityId: communityId,
			},
		});
		if (!userCommunity)
			return res.status(404).json({ message: "user or community not found" });
		const cycles = await prisma.cycle.findMany({
			where: {
				communityId: communityId,
			},
		});
		const currentCycle = cycles.find((x) => x.status === CycleStatus.Current);
		const daysLeftInCycle = getDaysDifference(
			today,
			new Date(currentCycle!.endDate)
		);
		const userRecognitionsInCycle = await prisma.rad.findMany({
			where: {
				// AND: [
				OR: [{ senderId: userCommunity.id }, { receiverId: userCommunity.id }],
				// {
				createdAt: {
					gte: currentCycle!.startDate,
					lt: currentCycle!.endDate,
				},
				// },
				// ],
			},
		});
		const userRecognitionsTotal = await prisma.rad.count({
			where: {
				OR: [{ senderId: userCommunity.id }, { receiverId: userCommunity.id }],
			},
		});
		const recognitionsTotal = await prisma.rad.count({
			where: {
				OR: [
					{
						sender: {
							communityId: communityId,
						},
					},
					{
						receiver: {
							communityId: communityId,
						},
					},
				],
			},
		});
		const recognitionsSent = userRecognitionsInCycle.filter(
			(x) => x.senderId === userCommunity.id
		).length;
		const recognitionsReceived = userRecognitionsInCycle.filter(
			(x) => x.receiverId === userCommunity.id
		).length;
		const recognitionsSentPercentage =
			(recognitionsSent * 100) / recognitionsTotal;
		const recognitionsPerMember = Object.values(
			userRecognitionsInCycle.reduce<{
				[userId: string]: { userId: string; memberId: string; total: number };
			}>((acc, obj) => {
				const { senderId, receiverId } = obj;
				const key =
					senderId === userCommunity.id
						? senderId + receiverId
						: receiverId + senderId;
				const user = senderId === userCommunity.id ? senderId : receiverId;
				const member = senderId === userCommunity.id ? receiverId : senderId;
				if (
					acc[key]
					// && (acc[user].userId === senderId || acc[user].userId === receiverId)
				)
					acc[key].total += 1;
				else acc[key] = { userId: user, memberId: member, total: 1 };
				return acc;
			}, {})
		);
		const highestInteraction = recognitionsPerMember.reduce(
			(maxObj, currObj) => {
				return currObj.total > maxObj.total ? currObj : maxObj;
			},
			recognitionsPerMember[0]
		);
		const user = highestInteraction
			? await prisma.userCommunity.findFirst({
					where: {
						id: highestInteraction.userId,
					},
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
			  })
			: null;
		const member = highestInteraction
			? await prisma.userCommunity.findFirst({
					where: {
						id: highestInteraction?.memberId,
					},
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
			  })
			: null;

		const communityRecognitions = await prisma.recognition.findMany({
			where: {
				OR: [{ senderId: userCommunity.id }, { receiverId: userCommunity.id }],
			},
		});
		const emos: EmotionType[] = communityRecognitions.map((x) => x.emotion);
		const emotions = emos.reduce((acc, emotion) => {
			if (!acc[emotion]) {
				acc[emotion] = 0;
			}
			acc[emotion]++;
			return acc;
		}, {} as Record<EmotionType, number>);
		const dashboard = {
			cyclesTotal: cycles.length,
			radsReceivedTotal: userCommunity.rads,
			recognitionsSent,
			recognitionsReceived,
			recognitionsSentPercentage,
			highestInteraction: {
				total: highestInteraction?.total ?? 0,
				user: user?.user ?? { id: "", firstName: "", lastName: "", image: "" },
				member: member?.user ?? {
					id: "",
					firstName: "",
					lastName: "",
					image: "",
				},
			},
			userRecognitionsTotal,
			userRecognitionsInCycle: userRecognitionsInCycle.length,
			daysLeftInCycle,
			emotions: Object.entries(emotions),
		};
		return res.status(200).json(dashboard);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "users/[id]/communities/[community]/dashboard",
				method: req.method ?? "GET",
			},
		});
		return res.status(500).json({ message: error.message });
	}
}
