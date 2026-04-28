import { connectToDatabase } from "@/lib/mongodb";
import { Server } from "socket.io";

const simulateAsyncPause = () =>
	new Promise((resolve: any) => {
		setTimeout(() => resolve(), 1000);
	});

const options = {
	cors: {
		origin: "*",
	},
};
const socketHandler = async (req: any, res: any) => {
	if (!res.socket.server.io) {
		const io = new Server(res.socket.server, options);
		res.socket.server.io = io;
		console.log("new socket running");
		const onConnection = async (socket: any) => {
			console.log("user connected");

			socket.on("join", (userId: string) => {
				socket.join(userId);
				console.log(`user ${userId} joined room`);
			});

			socket.on("newNotification", (userId: string) => {
				console.log("new notification");
				socket.to(userId).emit("retrieveNotifications");
			});

			socket.on("disconnect", () => {
				console.log("user disconnected");
			});
		};

		io.on("connection", onConnection);
	} else {
		console.log("socket already running");
	}
	res.end();
};

export default socketHandler;
