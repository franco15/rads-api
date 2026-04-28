import { auth } from "@/lib/firebase-admin";

export function withAuth(handler: any) {
	return async (req: any, res: any) => {
		if (req.method === "OPTIONS") {
			res.status(200).end();
			return;
		}
		const auhtHeader = req.headers.authorization;
		if (!auhtHeader) return res.status(401).json({ message: "Unauthorized." });

		const token = auhtHeader.split(" ")[1];
		let decodedToken;
		try {
			decodedToken = await auth.verifyIdToken(token);
			if (!decodedToken || !decodedToken.uid)
				return res.status(401).json({ message: "Unauthorized." });
		} catch (error: any) {
			const errorCode = error.errorInfo.code;
			error.status = 401;
			if (errorCode === "auth/internal-error") error.status = 500;
			return res.status(error.status).json({ error: errorCode });
		}
		return handler(req, res);
	};
}

export function userApiAuth(handler: any) {
	return async (req: any, res: any) => {
		if (req.method === "POST") return handler(req, res);
		const auhtHeader = req.headers.authorization;
		if (!auhtHeader) return res.status(401).json({ message: "Unauthorized." });

		const token = auhtHeader.split(" ")[1];
		let decodedToken;
		try {
			decodedToken = await auth.verifyIdToken(token);
			if (!decodedToken || !decodedToken.uid)
				return res.status(401).json({ message: "Unauthorized." });
		} catch (error: any) {
			const errorCode = error.errorInfo.code;
			error.status = 401;
			if (errorCode === "auth/internal-error") error.status = 500;
			return res.status(error.status).json({ error: errorCode });
		}
		return handler(req, res);
	};
}
