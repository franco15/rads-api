/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	typescript: {},
	// crossOrigin: 'anonymous'
	async headers() {
		return [
			{
				// Routes this applies to
				source: "/api/(.*)",
				// Headers
				headers: [
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
					{
						key: "Access-Control-Allow-Methods",
						value: "GET, POST, PUT, DELETE, OPTIONS",
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "Content-Type, Authorization",
					},
				],
			},
		];
	},
}

module.exports = nextConfig
