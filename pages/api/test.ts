import type { NextApiRequest, NextApiResponse } from "next";
import { userApiAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/firebase-admin";
import {
	CycleDuration,
	CycleStatus,
	EmotionType,
	Roles,
} from "@/lib/interfaces";
import pusher from "@/lib/pusher";
import { addDays, getCycleDates } from "@/lib/utils";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		// case "GET":
		// 	return getCommunityRecognitions(req, res);
		// case "POST":
		// 	return getCommunityInfo(req, res);
		// return revertCycleRads(req, res);
		// case 'PUT':
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default handler;

async function test(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		// const pushRes = await pusher.trigger(
		// 	"6413898ccc2740d22f7577c8",
		// 	"test-event",
		// 	{
		// 		message: "kewl test-event",
		// 	}
		// );
		// const pushRes = await pusher.trigger(
		// 	"6413898ccc2740d22f7577c8",
		// 	"event-test",
		// 	{
		// 		message: "kewl event-test",
		// 	},
		// 	{}
		// );
		return res.status(200).json({ message: "ok" });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function createJuanUsers(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		let created = 0;
		for (let index = 1; index <= 30; index++) {
			const email = `juan${index}@test.com`;
			let fbUser;
			try {
				fbUser = await auth.getUserByEmail(email);
			} catch (error: any) {}
			if (!fbUser) {
				fbUser = await auth.createUser({
					email,
					password: "Test123!",
				});
				await auth.setCustomUserClaims(fbUser.uid, {
					role: "user",
				});
			}

			const newUser = {
				uid: fbUser.uid,
				firstName: "Juan",
				lastName: `Test ${index}`,
				email: email,
				rads: 0,
			};
			const userCreated = await prisma.user.create({ data: newUser });
			if (userCreated) created++;
		}
		return res.status(200).json(created);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function reseedCycles(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const communities = await prisma.community.findMany();
		// const today = new Date();
		// today.setHours(0, 0, 0, 0);
		// // it will always start at the beggining of the month
		// const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
		// // the default lenght will be 1 day
		// const lastDay = addDays(1, today);
		await prisma.cycle.deleteMany();
		let startDate = new Date("2024/01/24");
		startDate.setHours(0, 0, 0, 0);
		let dates = getCycleDates(startDate, CycleDuration.Weekly);
		for (let index = 0; index < 6; index++) {
			let status =
				index < 4
					? CycleStatus.Done
					: index < 5
					? CycleStatus.Current
					: CycleStatus.Next;
			await prisma.$transaction(
				communities.map((community) => {
					return prisma.cycle.create({
						data: {
							startDate: dates.startDate,
							endDate: dates.endDate,
							rads: 50,
							duration: CycleDuration.Weekly,
							communityId: community.id,
							status: status,
						},
					});
				})
			);
			startDate = dates.endDate;
			dates = getCycleDates(startDate, CycleDuration.Weekly);
		}
		return res.status(200).json({ message: "ok" });
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function getCommunityInfo(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const id = "6633fb78005869757dd54452";
		// const communities = await prisma.community.findMany();
		// const uc = await prisma.userCommunity.findMany({
		// 	where: {
		// 		communityId: id,
		// 	},
		// 	include: { recognitionsReceived: true, recognitionsSent: true },
		// });
		// const cycles = await prisma.cycle.findMany({
		// 	where: {
		// 		communityId: id,
		// 	},
		// });
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
		const info = community.members.map((x) => {
			return {
				name: `${x.user.firstName} ${x.user.lastName}`,
				rads: +x.rads.toFixed(2),
			};
		});
		return res.status(200).json(info);
		// return res.status(200).json(cycles);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

interface CommunityRecognitions {
	Quien: string;
	Ciclo: string;
	AQuien: string;
	Porque: string;
	TotalRads: number;
	// Emocion: string;
}

async function getCommunityRecognitions(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const id = "6633fb78005869757dd54452";
		const cycles = await prisma.cycle.findMany({
			where: {
				communityId: id,
			},
		});
		const recognitions = await prisma.recognition.findMany({
			where: {
				sender: {
					communityId: id,
				},
			},
			include: {
				sender: {
					select: {
						rads: true,
						user: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				},
				receiver: {
					select: {
						user: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
		});
		const ret = recognitions.map((rec) => {
			const cicle = cycles.find(
				(x) => rec.createdAt >= x.startDate && rec.createdAt < x.endDate
			);
			const tmp: CommunityRecognitions = {
				Quien: rec.sender.user.firstName + " " + rec.sender.user.lastName,
				Ciclo: cicle
					? cicle.startDate.toLocaleDateString("en-US") +
					  " - " +
					  cicle.endDate.toLocaleDateString("en-US")
					: "SABE",
				AQuien: rec.receiver.user.firstName + " " + rec.receiver.user.lastName,
				Porque: rec.note,
				TotalRads: +rec.sender.rads.toFixed(2),
				// Emocion: EmotionType[rec.emotion].toString(),
			};
			return tmp;
		});
		return res.status(200).json({ ret });
		// return res.status(200).json(cycles);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

async function revertCycleRads(
	req: NextApiRequest,
	res: NextApiResponse<Data>
) {
	try {
		const id = "6633fb78005869757dd54452";
		const cycleId = "6633fb78005869757dd54453";
		const cycle = await prisma.cycle.findUnique({
			where: {
				id: cycleId,
			},
			include: {
				community: {
					include: {
						members: {
							include: {
								radsSent: {
									where: { sent: false },
									include: {
										receiver: true,
									},
								},
								user: true,
							},
						},
					},
				},
			},
		});

		if (!cycle) return res.status(404).json({ message: "cycle not found" });
		const members = cycle.community.members;
		members.forEach(async (member) => {
			await prisma.userCommunity.update({
				where: { id: member.id },
				data: {
					rads: 0,
				},
			});
			await prisma.rad.updateMany({
				where: {
					senderId: member.id,
				},
				data: {
					sent: false,
				},
			});
		});

		return res.status(200).json({});
		// return res.status(200).json(cycles);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}
