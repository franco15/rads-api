import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { auth, storageBucket } from "@/lib/firebase-admin";
import httpService from "@/lib/httpService";

type Data = {};

const handler = async (
	req: NextApiRequest,
	res: NextApiResponse<Data | null>
) => {
	switch (req.method) {
		case "PUT":
			return editUser(req, res);
		case "DELETE":
			return deleteUser(req, res);
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default withAuth(handler);

async function editUser(
	req: NextApiRequest,
	res: NextApiResponse<Data | null>
) {
	try {
		const { id } = req.query;
		const { image, firstName, lastName } = req.body;
		const user = await prisma.user.update({
			where: {
				id: id as string,
			},
			data: {
				firstName,
				lastName,
				image,
			},
		});
		if (!user) return res.status(404).json({ message: "user not found" });
		return res.status(200).json({ message: "user updated." });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function deleteUser(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const query = req.query;
		const id = query.id as string;

		const user = await prisma.user.findUnique({
			where: { id: id },
		});
		if (!user) return res.status(409).json({ message: "User doesn't exists." });

		const userCommunities = await prisma.userCommunity.findMany({
			where: { userId: id },
			select: { id: true, communityId: true },
		});

		const ucids = userCommunities.map((x) => x.id);
		const communities = userCommunities.map((x) => x.communityId);

		await prisma.talk.deleteMany({
			where: { OR: { senderId: id, receiverId: id } },
		});
		// await prisma.talk.deleteMany({
		// 	where: { receiverId: id },
		// });

		await prisma.notification.deleteMany({
			where: { userId: id },
		});
		await prisma.userDevice.deleteMany({
			where: { userId: id },
		});
		await prisma.invite.deleteMany({
			where: {
				OR: {
					inviteeId: id,
					inviterId: id,
				},
			},
		});
		// await prisma.invite.deleteMany({
		// 	where: { inviterId: id },
		// });
		await prisma.feedback.deleteMany({
			where: { userId: id },
		});

		await prisma.recognition.deleteMany({
			where: {
				OR: {
					senderId: id,
					receiverId: id,
				},
			},
		});
		// await prisma.recognition.deleteMany({
		// 	where: { toUserId: id },
		// });

		// await prisma.person.deleteMany({
		// 	where: { firstPersonId: id },
		// });
		// await prisma.person.deleteMany({
		// 	where: { thirdPersonId: id },
		// });

		await prisma.userCommunity.deleteMany({
			where: { userId: id },
		});

		await prisma.community.updateMany({
			where: { id: { in: communities } },
			data: {
				total: { decrement: 1 },
			},
		});

		// search for communities that are left empty except for the radical community
		const communitiesToDelete = await prisma.community.findMany({
			where: {
				AND: {
					total: 0,
					id: { not: process.env.RADICAL_COMMUNITY },
				},
			},
			select: {
				id: true,
			},
		});

		const cids = communitiesToDelete.map((x) => x.id);

		await prisma.cycle.deleteMany({
			where: { communityId: { in: cids } },
		});

		await prisma.community.deleteMany({
			where: { id: { in: cids } },
		});

		const fbUser = await auth.getUser(user.uid);
		if (fbUser) {
			try {
				await storageBucket.file(`profile/${fbUser.uid}.png`).delete();
			} catch (error: any) {}
			try {
				// since firebase auth user is used in both environments we need to check if it exists en the other env db
				const _user = await httpService.get(
					`${process.env.API_URL}/users/${user.id}/exists`
				);
				if (!_user.exists) await auth.deleteUser(fbUser.uid);
			} catch (error: any) {}
		}

		await prisma.user.delete({ where: { id: user.id } });

		return res.status(200).json({ message: "User deleted." });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
