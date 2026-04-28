import * as admin from "firebase-admin";

if (!admin.apps.length) {
	admin.initializeApp({
		credential: admin.credential.cert({
			projectId: process.env.FIREBASE_PROJECT_ID,
			clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
			privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
		}),
	});
}

const auth = admin.auth();
const storageBucket = admin.storage().bucket("rads-4b9b1.appspot.com");
const messaging = admin.messaging();

export { auth, storageBucket, messaging };
