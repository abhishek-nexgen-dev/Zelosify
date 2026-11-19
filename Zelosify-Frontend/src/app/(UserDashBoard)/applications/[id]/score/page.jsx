"use client";

import { useParams } from "next/navigation";
import RoleGuard from "@/components/recruitment/RoleGuard";
import ApplicationScorePage from "@/features/candidate/ApplicationScorePage";

const ALLOWED_ROLES = ["CANDIDATE", "ADMIN", "RECRUITER", "HIRING_MANAGER"];

export default function Page() {
  const params = useParams();
  const applicationId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  return (
    <RoleGuard allow={ALLOWED_ROLES}>
      <ApplicationScorePage applicationId={applicationId} />
    </RoleGuard>
  );
}
