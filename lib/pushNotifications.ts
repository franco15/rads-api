import prisma from "@/lib/prisma";
import { messaging } from "@/lib/firebase-admin";

export async function sendToSingelUser(userId: string, payload: any) {
	const userDevices = await prisma.userDevice.findMany({
		where: {
			userId: userId,
		},
		select: {
			fcmToken: true,
		},
	});
	if (userDevices.length > 0) {
		const tokens = userDevices.map((item) => item.fcmToken);
		const sent = await messaging.sendEachForMulticast({
			tokens,
			notification: {
				body: payload.body,
				title: payload.title,
			},
		});
	}
}
