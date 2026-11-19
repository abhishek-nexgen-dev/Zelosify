import RoleGuard from "@/components/recruitment/RoleGuard";

export default function AdminLayout({ children }) {
  return <RoleGuard allow={["ADMIN"]}>{children}</RoleGuard>;
}
