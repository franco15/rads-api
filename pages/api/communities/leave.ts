import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import pusher from "@/lib/pusher";
import { storageBucket } from "@/lib/firebase-admin";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "DELETE":
			return leaveCommunity(req, res);
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function leaveCommunity(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const query = req.query;
		const userId = query.userId as string;
		const body = req.body;
		const socket_id = body.socket_id as string;

		const communityId = query.communityId as string;
		const userCommunity = await prisma.userCommunity.findFirst({
			where: { userId, communityId },
		});

		if (!userCommunity)
			return res.status(404).json({ message: "user in community not found" });

		await prisma.userCommunity.update({
			where: { id: userCommunity.id },
			data: { active: false },
		});

		const community = await prisma.community.update({
			where: { id: communityId },
			data: { total: { decrement: 1 } },
		});

		let deleted = false;
		if (
			community.id !== process.env.RADICAL_COMMUNITY &&
			community.total === 0
		) {
			try {
				await storageBucket.file(`communities/${community.id}.png`).delete();
			} catch (error: any) {}
			const invites = await prisma.invite.findMany({
				where: { communityId },
				select: {
					code: true,
				},
			});

			await prisma.notification.deleteMany({
				where: {
					parameters: { in: Object.values(invites.flat) },
				},
			});

			const ucIds = (
				await prisma.userCommunity.findMany({
					where: {
						communityId: community.id,
					},
					select: {
						id: true,
					},
				})
			).map((x) => x.id);

			await prisma.cycle.deleteMany({
				where: {
					communityId: community.id,
				},
			});

			await prisma.recognition.deleteMany({
				where: {
					OR: {
						senderId: { in: ucIds },
						receiverId: { in: ucIds },
					},
				},
			});
			await prisma.userCommunity.deleteMany({
				where: {
					communityId: community.id,
				},
			});
			await prisma.rad.deleteMany({
				where: {
					OR: {
						senderId: { in: ucIds },
						receiverId: { in: ucIds },
					},
				},
			});
			await prisma.talk.deleteMany({
				where: {
					OR: {
						senderId: { in: ucIds },
						receiverId: { in: ucIds },
					},
				},
			});

			await prisma.invite.deleteMany({
				where: { communityId },
			});
			await prisma.community.delete({
				where: { id: community.id },
			});
			deleted = true;
		}
		if (socket_id && !deleted) {
			const com = await prisma.community.findFirst({
				where: { id: communityId },
			});
			await pusher.trigger(
				community.id,
				"left-community",
				{ communityId: community.id, userCommunityId: userCommunity.id },
				{ socket_id }
			);
		}
		return res.status(200).json({ message: "Ok", status: 200 });
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/communities/leave",
				method: req.method ?? "DELETE",
			},
		});
		return res.status(500).json({ message: error.message });
	}
}
