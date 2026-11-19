import RoleGuard from "@/components/recruitment/RoleGuard";

export default function layout({ children }) {
  return <RoleGuard allow={["IT_VENDOR"]}>{children}</RoleGuard>;
}
