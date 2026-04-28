import { auth } from "./firebase";

const getToken = async () => {
	const user = auth.currentUser;
	const token = user && (await user.getIdToken());
	return token;
};

const getHeaders = async (auth: boolean): Promise<{}> => {
	if (auth) {
		const token = await getToken();
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		};
	}
	return {
		"Content-Type": "application/json",
	};
};

const httpService = {
	get: async (endpoint: string, auth = true) => {
		const headers = await getHeaders(auth);
		const res = await fetch(endpoint, {
			method: "GET",
			headers: headers,
		});
		return res.json();
	},
	post: async <T>(endpoint: string, data: T, auth = true) => {
		const headers = await getHeaders(auth);
		const res = await fetch(endpoint, {
			method: "POST",
			headers: headers,
			body: JSON.stringify(data),
		});
		return res.json();
	},
	put: async <T>(endpoint: string, data: T, auth = true) => {
		const headers = await getHeaders(auth);
		const res = await fetch(endpoint, {
			headers: headers,
			body: JSON.stringify(data),
		});
		return res.json();
	},
	delete: async (endpoint: string, auth = true) => {
		const headers = await getHeaders(auth);
		const res = await fetch(endpoint, {
			method: "DELETE",
			headers: headers,
		});
		return res.json();
	},
	gql: async (query: any, auth = true) => {
		const headers = await getHeaders(auth);
		const res = await fetch("api/graphql", {
			method: "POST",
			headers: headers,
			body: JSON.stringify({ query }),
		});
		return res.json();
	},
};

export default httpService;
