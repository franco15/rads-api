import type { NextApiRequest, NextApiResponse } from "next";
import { userApiAuth } from "@/lib/middlewares";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/firebase-admin";
import { Roles } from "@/lib/interfaces";

type Data = {};

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
	switch (req.method) {
		case "GET":
			// const { uid } = req.query;
			// if (uid) return getUserByUid(req, res);
			return getUsers(req, res);
		case "POST":
			return createUser(req, res);
		// case 'PUT':
		// 	break;
		// case 'DELETE':
		// 	break;
		default:
			return res.status(400).json({ message: "method not allowed" });
	}
};

export default userApiAuth(handler);

async function getUsers(req: NextApiRequest, res: NextApiResponse<Data>) {
	try {
		const { skip, take } = req.query;
		let skipInt = parseInt(skip as string);
		let takeInt = parseInt(take as string);
		if (!skipInt) skipInt = 0;
		if (!takeInt) takeInt = 10;
		takeInt = skipInt > 0 ? skipInt * takeInt : takeInt;
		const users = await prisma.user.findMany({
			// skip: skipInt,
			// take: limit,
			orderBy: {
				createdAt: "asc",
			},
			include: {
				userCommunities: {
					select: {
						communityId: true,
						active: true,
					},
					// include: {
					// 	community: {
					// 		select: {
					// 			id: true,
					// 		},
					// 	},
					// },
				},
			},
		});
		return res.status(200).json(users);
	} catch (error: any) {
		return res.status(500).json({ message: error.message });
	}
}

type UserModel = {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	role?: string;
};

async function createUser(req: NextApiRequest, res: NextApiResponse<Data>) {
	const body = req.body;
	const user: UserModel = body.user;
	// const tmpPwd = "Test123!";
	const exists = await prisma.user.findFirst({
		where: {
			email: user.email.toLowerCase(),
		},
	});
	if (exists) {
		return res.status(409).json({ message: "User already exists." });
	}
	let fbUser;
	// this firebase user validation wont be needed when the user's are completely new
	try {
		// check if there's already a firebase user with this email
		fbUser = await auth.getUserByEmail(user.email.toLowerCase());
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: "in user doesnt exist in firebase\n" + error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/users",
				method: req.method ?? "POST",
			},
		});
	}
	try {
		if (!fbUser) {
			fbUser = await auth.createUser({
				email: user.email.toLowerCase(),
				password: user.password,
				// password: tmpPwd,
			});
			await auth.setCustomUserClaims(fbUser.uid, {
				role: Roles.User,
			});
		}

		const userCreated = await prisma.user.create({
			data: {
				uid: fbUser.uid,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email.toLowerCase(),
			},
		});
		return res.status(200).json(userCreated);
	} catch (error: any) {
		await prisma.apiErrors.create({
			data: {
				message: error.message,
				errorObject: JSON.stringify(error),
				url: req.url ?? "/users",
				method: req.method ?? "POST",
			},
		});

		return res.status(500).json({ message: error.message });
	}
}
