"use client";

import Link from "next/link";
import { X } from "lucide-react";

const MobileMenu = ({ isMenuOpen, closeMenu, user, dashboardHref, authChecked }) => {
  if (!isMenuOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        aria-label="Close menu overlay"
        onClick={closeMenu}
        className="absolute inset-0 bg-[#0b0b0b]/40"
      />
      <div
        id="landing-mobile-menu"
        className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-white/[0.08] bg-[#0b0b0b] p-5 shadow-2xl shadow-slate-950/20 dark:border-slate-800 dark:bg-[#050505] sm:p-6"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100 dark:text-slate-100">Menu</span>
          <button
            type="button"
            onClick={closeMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-white/[0.08] text-slate-200 hover:bg-[#0b0b0b] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#171717]"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-2">
          <Link
            href="/#about"
            onClick={closeMenu}
            className="rounded-[8px] px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0b0b0b] hover:text-slate-100 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
          >
            About
          </Link>
          <Link
            href="/jobs"
            onClick={closeMenu}
            className="rounded-[8px] px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0b0b0b] hover:text-slate-100 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
          >
            Find jobs
          </Link>
          <Link
            href="/#platform"
            onClick={closeMenu}
            className="rounded-[8px] px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0b0b0b] hover:text-slate-100 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
          >
            Platform
          </Link>
          <Link
            href="/#how-it-works"
            onClick={closeMenu}
            className="rounded-[8px] px-3 py-2 text-sm font-medium text-slate-200 hover:bg-[#0b0b0b] hover:text-slate-100 dark:text-slate-300 dark:hover:bg-[#171717] dark:hover:text-white"
          >
            How it works
          </Link>
        </nav>

        <div className="mt-auto border-t border-white/[0.08] pt-4 dark:border-slate-800">
          {user ? (
            <Link
              href={dashboardHref}
              onClick={closeMenu}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
            >
              Dashboard
            </Link>
          ) : authChecked ? (
            <>
              <Link
                href="/login"
                onClick={closeMenu}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                Create account
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
