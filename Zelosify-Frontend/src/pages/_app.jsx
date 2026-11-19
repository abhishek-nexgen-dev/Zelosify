"use client";

import "@/styles/globals.css";
import AllProvider from "@/redux/core/AllProvider";

export default function App({ Component, pageProps }) {
  return (
    <AllProvider>
      <Component {...pageProps} />
    </AllProvider>
  );
}
