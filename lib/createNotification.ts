import { PrismaClient } from "@prisma/client";
import { NotificationType } from "./interfaces";

export async function createNotification(
	prisma: PrismaClient,
	userId: string,
	description: string,
	type: NotificationType,
	parameters: string = ""
) {
	const notification = {
		description,
		userId,
		read: false,
		parameters,
		type,
	};
	return await prisma.notification.create({
		data: notification,
	});
}
