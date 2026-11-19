"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import MobileMenu from "../MobileMenu";
import useAuth from "@/hooks/Auth/useAuth";
import { clearAuthData, getDashboardPathForRole } from "@/utils/Auth/authUtils";
import { getLoginRedirectPath, isExpiredSessionMessage } from "@/utils/Auth/sessionAuth";

export default function LandingNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const { user, loading, handleCheckAuthStatus } = useAuth();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (authChecked) return undefined;

    let active = true;
    const hadCachedUser = Boolean(userRef.current);
    handleCheckAuthStatus()
      .unwrap()
      .catch((authError) => {
        if (!active || !hadCachedUser || !isExpiredSessionMessage(authError)) return;
        const redirectPath = getLoginRedirectPath(
          window.location.pathname,
          window.location.search,
          true
        );
        if (redirectPath) {
          clearAuthData();
          window.location.replace(redirectPath);
        }
      })
      .finally(() => {
        if (active) setAuthChecked(true);
      });

    return () => {
      active = false;
    };
  }, [authChecked, handleCheckAuthStatus]);

  const dashboardHref = getDashboardPathForRole(user?.role);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200/70 bg-[#0b0b0b] shadow-sm shadow-slate-950/[0.03] backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#050505]/85">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/assets/logos/zelosify_Dark.png"
              alt="Zelosify"
              className="h-8 w-auto dark:hidden sm:h-9"
            />
            <img
              src="/assets/logos/main-logo.png"
              alt="Zelosify"
              className="hidden h-8 w-auto dark:block sm:h-9"
            />
          </Link>

          <nav aria-label="Main navigation" className="hidden shrink-0 items-center gap-1 lg:flex">
            <Link
              href="/#about"
                className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-[#111111] hover:text-slate-50 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
            >
              About
            </Link>
            <Link
              href="/jobs"
                className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-[#111111] hover:text-slate-50 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
            >
              Find jobs
            </Link>
            <Link
              href="/#platform"
                className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-[#111111] hover:text-slate-50 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
            >
              Platform
            </Link>
            <Link
              href="/#how-it-works"
                className="whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-[#111111] hover:text-slate-50 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
            >
              How It Works
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href={dashboardHref}
                className="hidden min-h-10 shrink-0 items-center whitespace-nowrap rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 lg:inline-flex"
              >
                Dashboard
              </Link>
            ) : authChecked && !loading ? (
              <>
                <Link
                  href="/login"
                  className="hidden min-h-10 shrink-0 items-center whitespace-nowrap rounded-xl border border-white/[0.12] px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 lg:inline-flex"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="hidden min-h-10 shrink-0 items-center whitespace-nowrap rounded-xl bg-lime-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 lg:inline-flex"
                >
                  Create account
                </Link>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0b0b0b] text-slate-200 transition hover:border-lime-300/20 hover:bg-[#141414] hover:text-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 dark:border-slate-700 dark:bg-[#0b0b0b] dark:text-slate-300 dark:hover:border-lime-800 dark:hover:bg-[#141414] dark:hover:text-lime-200 lg:hidden"
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu
        isMenuOpen={isMenuOpen}
        closeMenu={() => setIsMenuOpen(false)}
        user={user}
        dashboardHref={dashboardHref}
        authChecked={authChecked}
      />
    </>
  );
}
