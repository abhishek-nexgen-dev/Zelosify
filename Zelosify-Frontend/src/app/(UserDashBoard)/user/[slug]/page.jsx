"use client";

import { notFound } from "next/navigation";
import { use } from "react";
import FinancePage from "@/pages/UserDashboardPage/Finance/FinancePage";

export default function UserSubPage({ params }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  if (!["finance"].includes(slug)) {
    notFound();
  }

  switch (slug) {
    case "finance":
      return <FinancePage />;

    default:
      return null;
  }
}
