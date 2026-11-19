"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import UserProfile from "./UserProfile";

const pageTitles = [
  ["/candidate/dashboard", "Candidate dashboard"],
  ["/candidate/applications", "My applications"],
  ["/candidate/profile", "My profile"],
  ["/jobs", "Find jobs"],
  ["/recruiter/jobs", "Job openings"],
  ["/hiring-manager/openings", "My openings"],
  ["/vendor/openings", "Contract openings"],
  ["/vendor/payments", "Payments"],
  ["/admin/recruiters", "Recruiters"],
  ["/admin/permissions", "Team permissions"],
  ["/dashboard", "Team dashboard"],
];

function getPageTitle(pathname = "") {
  if (pathname.includes("/score")) return "Resume score";
  if (pathname.includes("/applicants")) return "Candidate review";
  if (pathname === "/admin/recruiters/new") return "Create recruiter";
  if (pathname.startsWith("/recruiter/jobs/") && pathname !== "/recruiter/jobs")
    return "Opening details";
  if (pathname.startsWith("/jobs/") && pathname !== "/jobs") return "Job details";
  const match = pageTitles.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  if (match) return match[1];
  return "Workspace";
}

const Header = memo(({ isSidebarOpen, toggleSidebar }) => {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsProfileOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex h-[4.25rem] shrink-0 items-center border-b border-white/[0.07] bg-[#0b0b0b]/90 px-3 backdrop-blur-xl transition-[padding] duration-300 sm:px-5 ${
        isSidebarOpen ? "lg:pl-64" : "lg:pl-20"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isSidebarOpen}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-300 transition hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300 sm:block">
              Zelosify workspace
            </p>
            <p className="truncate text-sm font-semibold text-slate-100 sm:mt-0.5 sm:text-base">
              {getPageTitle(pathname)}
            </p>
          </div>
        </div>

        <UserProfile
          isProfileOpen={isProfileOpen}
          toggleProfile={(nextOpen) =>
            setIsProfileOpen((open) => (typeof nextOpen === "boolean" ? nextOpen : !open))
          }
          profileRef={profileRef}
        />
      </div>
    </header>
  );
});

Header.displayName = "Header";
export default Header;
