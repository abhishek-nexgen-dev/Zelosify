import RoleGuard from "@/components/recruitment/RoleGuard";

export default function RecruiterLayout({ children }) {
  return (
    <RoleGuard allow={["ADMIN", "IT_VENDOR", "RECRUITER", "HIRING_MANAGER"]}>{children}</RoleGuard>
  );
}
