import RoleGuard from "@/components/recruitment/RoleGuard";
import InternalDashboardPage from "@/features/internal-dashboard/InternalDashboardPage";

export default function DashboardPage() {
  return (
    <RoleGuard allow={["ADMIN", "RECRUITER", "HIRING_MANAGER", "IT_VENDOR"]}>
      <InternalDashboardPage />
    </RoleGuard>
  );
}
