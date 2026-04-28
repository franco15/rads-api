import { initializeApp, FirebaseOptions, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
	apiKey: "AIzaSyCOC5QyBHRMn60eusqPT577loHeH6ANl34",
	authDomain: "rads-4b9b1.firebaseapp.com",
	projectId: "rads-4b9b1",
	storageBucket: "rads-4b9b1.appspot.com",
	messagingSenderId: "781281847363",
	appId: "1:781281847363:web:64d90aca322e05e3f58cf6",
	// del firebase mio, no sale en la nueva config
	// measurementId: "G-VCCP60DE7R",
};

// Initialize firebase
const createFirebaseApp = (config: FirebaseOptions) => {
	try {
		return getApp();
	} catch {
		return initializeApp(config);
	}
};

const firebaseApp = createFirebaseApp(firebaseConfig);

// Auth exports
export const auth = getAuth(firebaseApp);

// FireStore exports
export const firestore = getFirestore(firebaseApp);

// Storage exports
export const storage = getStorage(firebaseApp);
