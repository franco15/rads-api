import "../styles/globals.css";
import React from "react";
import type { AppProps } from "next/app";
// import { ApolloProvider } from "@apollo/client";

// import apolloClient from "@/lib/apolloClient";

function App({ Component, pageProps }: AppProps) {
	return <Component {...pageProps} />;
}

export default App;
