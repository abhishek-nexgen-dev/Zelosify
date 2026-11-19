"use client";

import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { memo } from "react";
import useAuth from "@/hooks/Auth/useAuth";

function getInitials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "U"
  );
}

const UserProfile = memo(({ isProfileOpen, toggleProfile, profileRef }) => {
  const { user, handleOpenSignoutConfirmation, getDisplayName, getUserHandle } = useAuth();
  const displayName = getDisplayName() || "Account";
  const userHandle = user?.email || getUserHandle() || "";
  const roleLabel = user?.role?.replaceAll("_", " ") || "Member";

  return (
    <div className="relative shrink-0" ref={profileRef}>
      <button
        type="button"
        onClick={toggleProfile}
        className="flex min-h-11 items-center gap-2 rounded-xl border border-transparent px-2 py-1.5 transition hover:border-white/[0.08] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:gap-3 sm:px-3"
        aria-label="Toggle account menu"
        aria-expanded={isProfileOpen}
        aria-haspopup="menu"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-lime-300/20 bg-gradient-to-br from-lime-400/25 to-cyan-300/10 text-xs font-bold text-lime-100">
          {getInitials(displayName)}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold text-slate-100">
            {displayName}
          </span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {roleLabel}
          </span>
        </span>
        <ChevronDown
          className={`hidden h-4 w-4 text-slate-500 transition sm:block ${isProfileOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {isProfileOpen && (
        <div
          className="absolute right-0 z-[70] mt-2 w-[min(19rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0b0b0b] shadow-[0_24px_70px_-28px_rgba(0,0,0,0.9)]"
          role="menu"
        >
          <div className="border-b border-white/[0.07] bg-gradient-to-br from-lime-400/[0.08] to-transparent px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-300/20 bg-lime-400/[0.1] text-sm font-bold text-lime-100">
                {getInitials(displayName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="mt-1 truncate text-xs text-slate-400">{userHandle}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-lime-300/15 bg-lime-300/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-lime-200">
                {roleLabel}
              </span>
              {user?.tenant?.companyName && (
                <span className="max-w-full truncate text-xs text-slate-500">
                  {user.tenant.companyName}
                </span>
              )}
            </div>
          </div>

          {user?.role === "CANDIDATE" && (
            <Link
              href="/candidate/profile"
              role="menuitem"
              onClick={() => toggleProfile(false)}
              className="flex min-h-11 items-center gap-3 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/[0.04] hover:text-white focus-visible:bg-white/[0.05]"
            >
              <UserRound className="h-4 w-4 text-slate-500" aria-hidden="true" /> My profile
            </Link>
          )}

          <div className="border-t border-white/[0.07] p-2">
            <button
              type="button"
              onClick={handleOpenSignoutConfirmation}
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-300/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
              role="menuitem"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

UserProfile.displayName = "UserProfile";
export default UserProfile;
