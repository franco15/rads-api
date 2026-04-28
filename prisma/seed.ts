import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	const users = await prisma.user.count();
	if (!users || users === 0) {
		await prisma.user.create({
			data: {
				uid: "",
				firstName: "Luis",
				lastName: "Franco",
				email: "franco.xipe@gmail.com",
				rads: 0,
				role: "admin",
				image: "",
			},
		});
	}

	const communities = await prisma.community.count();
	if (!communities) {
		await prisma.community.create({
			data: {
				name: "Radical",
				description: "Radical community",
				image: "",
				total: 0,
			},
		});
	}

	// const adminUsers = await prisma.adminUser.count();
	// if (!adminUsers) {
	await prisma.adminUser.create({
		data: {
			uid: "KQnVbPGCPrTkqAXK5IoP7aXlkQY2",
			userId: "6496236c6f1ab7c07039f7be",
			communityId: "672bc97edc1ff6a3023ab971",
		},
	});
	// }

	console.log("done");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => await prisma.$disconnect);
