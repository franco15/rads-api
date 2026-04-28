// mongodb connection
// probably wont be using it one prisma and/or graphql are used

import * as mongodb from 'mongodb';

const URI = process.env.MONGODB_URI;
const DB = process.env.DB_NAME;

export async function connectToDatabase() {
	if (!URI || !DB) {
		throw new Error("Please add your Mongo URI and/or DB to .env.local");
	}
	const client: mongodb.MongoClient = new mongodb.MongoClient(URI);
	await client.connect();
	const db: mongodb.Db = client.db(DB);
	return db;
}