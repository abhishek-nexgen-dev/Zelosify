import {
  BriefcaseBusiness,
  FileCheck2,
  LogOut,
  CreditCard,
  Users,
  UserRound,
  LayoutDashboard,
  Scale3DIcon,
  Smile,
  Frown,
  ShieldCheck,
} from "lucide-react";
import { MdDataUsage } from "react-icons/md";
import { hasPermission } from "@/features/auth/permissions";

const getOverviewItemsByRole = (role) => {
  switch (role) {
    case "VENDOR_MANAGER":
      return [
        {
          title: "Smile",
          href: "#",
          icon: Smile,
          hasSubmenu: true,
          submenu: [{ title: "Sad", href: "/user", icon: Frown }],
        },
      ];

    case "BUSINESS_USER":
      return [
        {
          title: "Digital",
          href: "/business-user/digital-initiative",
          icon: MdDataUsage,
        },
        {
          title: "Dummy Page 1",
          href: "/business-user/dummy-page-1",
          icon: Scale3DIcon,
        },
      ];

    case "IT_VENDOR":
      return [
        {
          title: "Contract Openings",
          href: "/vendor/openings",
          icon: MdDataUsage,
        },
      ];

    case "HIRING_MANAGER":
      return [
        {
          title: "My Openings",
          href: "/hiring-manager/openings",
          icon: MdDataUsage,
        },
      ];

    default:
      return [
        {
          title: "Contract Openings (Vendor)",
          href: "/vendor/openings",
          icon: MdDataUsage,
        },
        {
          title: "My Openings (Manager)",
          href: "/hiring-manager/openings",
          icon: MdDataUsage,
        },
        { title: "Payments", href: "/vendor/payments", icon: CreditCard },
      ];
  }
};

export const getSidebarSectionsByRole = (role, permissions = []) => {
  const sections = [];

  if (role === "CANDIDATE") {
    sections.push({
      title: "Candidate",
      items: [
        {
          title: "Dashboard",
          href: "/candidate/dashboard",
          icon: LayoutDashboard,
        },
        { title: "Find Jobs", href: "/jobs", icon: BriefcaseBusiness },
        { title: "My Applications", href: "/candidate/applications", icon: FileCheck2 },
        { title: "My Profile", href: "/candidate/profile", icon: UserRound },
      ],
    });
  } else if (["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(role)) {
    sections.push({
      title: role === "HIRING_MANAGER" ? "Hiring Manager" : "Recruiting",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: BriefcaseBusiness },
        ...(role === "HIRING_MANAGER"
          ? [
              { title: "My Openings", href: "/hiring-manager/openings", icon: MdDataUsage },
              { title: "Create opening", href: "/recruiter/jobs/new", icon: BriefcaseBusiness },
            ]
          : [{ title: "Job Openings", href: "/recruiter/jobs", icon: BriefcaseBusiness }]),
        ...(role === "ADMIN"
          ? [
              { title: "Recruiters", href: "/admin/recruiters", icon: Users },
              { title: "Create Recruiter", href: "/admin/recruiters/new", icon: Users },
            ]
          : []),
        ...(role === "ADMIN"
          ? [{ title: "Team permissions", href: "/admin/permissions", icon: ShieldCheck }]
          : []),
      ],
    });
  } else if (role === "IT_VENDOR") {
    sections.push({
      title: "Vendor",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: BriefcaseBusiness },
        { title: "Contract Openings", href: "/vendor/openings", icon: MdDataUsage },
      ],
    });
  } else if (role === "BUSINESS_USER") {
    sections.push({
      title: "Business User",
      items: [
        {
          title: "Digital Initiative",
          href: "/business-user/digital-initiative",
          icon: MdDataUsage,
        },
        {
          title: "Dummy Page 1",
          href: "/business-user/dummy-page-1",
          icon: Scale3DIcon,
        },
      ],
    });
  }

  const user = { role, permissions };
  const has = (permission) => hasPermission(user, permission);
  return sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      if (item.href === "/recruiter/jobs") return has("JOBS_VIEW");
      if (item.href === "/recruiter/jobs/new") return has("JOBS_CREATE");
      if (item.href === "/vendor/openings") return has("JOBS_VIEW");
      if (item.href === "/admin/recruiters") return has("TEAM_VIEW");
      if (item.href === "/admin/recruiters/new")
        return role !== "IT_VENDOR" && has("RECRUITER_CREATE");
      if (item.href === "/admin/permissions") return role === "ADMIN";
      return true;
    }),
  }));
};

export const signOutItem = { title: "Sign Out", href: "#", icon: LogOut };
