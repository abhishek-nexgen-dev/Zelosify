import "@/styles/globals.css";
import AllProvider from "@/redux/core/AllProvider";

export const metadata = {
  title: {
    default: "Zelosify | Find your next opportunity",
    template: "%s | Zelosify",
  },
  description:
    "Explore open roles, apply with your resume, and track your applications. Zelosify also gives hiring teams one place to manage openings and review candidates.",
  icons: {
    icon: "/favicon1.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <AllProvider>{children}</AllProvider>
      </body>
    </html>
  );
}
