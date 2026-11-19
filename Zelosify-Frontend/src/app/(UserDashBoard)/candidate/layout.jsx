import RoleGuard from "@/components/recruitment/RoleGuard";

export default function CandidateLayout({ children }) {
  return <RoleGuard allow={["CANDIDATE"]}>{children}</RoleGuard>;
}
