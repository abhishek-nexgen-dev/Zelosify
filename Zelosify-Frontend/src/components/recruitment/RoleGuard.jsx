"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/Auth/useAuth";
import PageLoader from "@/components/recruitment/PageLoader";

export default function RoleGuard({ allow = [], children }) {
  const router = useRouter();
  const { user, handleCheckAuthStatus } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (user) {
      setChecked(true);
      return;
    }

    let active = true;
    handleCheckAuthStatus({ forceCheck: true, suppressErrors: true })
      .unwrap()
      .catch(() => {})
      .finally(() => {
        if (active) setChecked(true);
      });

    return () => {
      active = false;
    };
  }, [handleCheckAuthStatus, user]);

  useEffect(() => {
    if (checked && user && !allow.includes(user.role)) {
      const internalRoles = ["ADMIN", "RECRUITER", "HIRING_MANAGER", "IT_VENDOR"];
      router.replace(internalRoles.includes(user.role) ? "/dashboard" : "/user");
    }
    if (checked && !user) router.replace("/login");
  }, [allow, checked, router, user]);

  if (!checked || !user || !allow.includes(user.role)) {
    return (
      <PageLoader label="Checking account access…" className="mx-auto min-h-[50vh] max-w-5xl" />
    );
  }

  return children;
}
