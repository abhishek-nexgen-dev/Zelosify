"use client";

import dynamic from "next/dynamic";
import CircleLoader from "@/components/UI/loaders/CircleLoader";

const HomePage = dynamic(() => import("@/pages/UserDashboardPage/Home/HomePage"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <CircleLoader />
    </div>
  ),
});

export default function UserDashboardHomePage() {
  return <HomePage />;
}
