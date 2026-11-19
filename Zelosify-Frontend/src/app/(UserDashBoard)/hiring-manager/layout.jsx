import RoleGuard from "@/components/recruitment/RoleGuard";

export default function Layout({ children }) {
  return <RoleGuard allow={["HIRING_MANAGER"]}>{children}</RoleGuard>;
}
