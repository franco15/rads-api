import Pusher from "pusher";

const pusher = new Pusher({
	appId: "1602292",
	key: "f5e3ce1d804b5e17a69c",
	secret: "3cb592f258a8ce56e382",
	cluster: "us3",
	useTLS: true,
});

export default pusher;
