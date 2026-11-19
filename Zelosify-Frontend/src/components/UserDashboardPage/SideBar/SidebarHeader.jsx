"use client";

import { memo } from "react";
import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";

const SidebarHeader = ({ isOpen, isMobile, toggleSidebar }) => {
  const { user } = useAuth();
  const homeHref =
    user?.role === "CANDIDATE"
      ? "/candidate/dashboard"
      : user?.role === "BUSINESS_USER"
        ? "/business-user/digital-initiative"
        : "/dashboard";
  const ToggleIcon =
    isMobile && isOpen ? X : isOpen ? PanelLeftClose : isMobile ? Menu : PanelLeftOpen;

  return (
    <div className="flex h-[4.25rem] shrink-0 items-center justify-between border-b border-white/[0.07] px-3">
      <Link
        href={homeHref}
        aria-label="Go to workspace home"
        className={`flex min-w-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${isOpen ? "" : "mx-auto"}`}
      >
        {isOpen ? (
          <img
            src="/assets/logos/main-logo.png"
            alt="Zelosify"
            width={150}
            height={38}
            className="h-9 w-[9.25rem] object-contain object-left"
          />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-lime-300/20 bg-gradient-to-br from-lime-400/20 to-cyan-300/[0.06] text-lg font-black tracking-tight text-white">
            Z
          </span>
        )}
      </Link>
      {isOpen && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isMobile ? "Close navigation menu" : "Collapse navigation sidebar"}
          className="ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
        >
          <ToggleIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default memo(SidebarHeader);
