"use client";

import Link from "next/link";
import {
  ArrowRight,
  AtSign,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";

function initialsFor(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "C"
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 gap-3 rounded-2xl border border-white/[0.06] bg-black/10 p-4 sm:p-5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.035] text-slate-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </dt>
        <dd className="mt-1.5 break-words text-sm font-medium text-slate-200">
          {value || "Not provided"}
        </dd>
      </div>
    </div>
  );
}

export default function CandidateProfilePage() {
  const { user } = useAuth();
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Candidate";
  const details = [
    { label: "Email address", value: user?.email, icon: Mail },
    { label: "Username", value: user?.username ? `@${user.username}` : null, icon: AtSign },
    { label: "Phone number", value: user?.phoneNumber, icon: Phone },
    { label: "Department", value: user?.department, icon: BriefcaseBusiness },
    { label: "Organization", value: user?.tenant?.companyName, icon: Building2 },
  ];

  return (
    <div className="min-h-[calc(100vh-4.25rem)] bg-[#050505] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-7 sm:space-y-8">
        <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#111111] via-[#0b0b0b] to-[#0b0b0b] p-6 shadow-[0_28px_80px_-45px_rgba(36,47,82,0.8)] sm:rounded-[2rem] sm:p-9 lg:p-10">
          <div
            className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-lime-500/15 blur-[100px]"
            aria-hidden="true"
          />
          <p className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-100 sm:text-[11px]">
            <UserRound className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" /> Candidate
            workspace
          </p>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <span className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border border-lime-200/20 bg-gradient-to-br from-lime-300/20 to-cyan-300/[0.07] text-xl font-bold text-white shadow-inner sm:h-20 sm:w-20 sm:rounded-3xl sm:text-2xl">
                {initialsFor(displayName)}
              </span>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
                  Your profile
                </h1>
                <p className="mt-2 break-words text-sm font-semibold text-slate-200 sm:text-base">
                  {displayName}
                </p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  Candidate account · Your account details at a glance
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              <Link
                href="/candidate/applications"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> My applications{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
          <section className="min-w-0 rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.95)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300">
                  Account information
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Profile details
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Details currently associated with your Zelosify account.
                </p>
              </div>
              <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-lime-200 sm:flex">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
            </div>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {details.map((detail) => (
                <Detail key={detail.label} {...detail} />
              ))}
            </dl>
          </section>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#111111] to-[#0d1018] p-5 sm:p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-300/10 bg-emerald-300/[0.07] text-emerald-200">
                <BadgeCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-white">Keep your applications current</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Replace a resume or review its AI screening from your applications workspace.
              </p>
              <Link
                href="/candidate/applications"
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-lime-200 transition hover:bg-white/[0.04] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                Manage applications <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
            <section className="rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Next step
              </p>
              <h2 className="mt-2 font-semibold text-white">Find a role that fits</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Explore current openings and submit an application with your resume.
              </p>
              <Link
                href="/jobs"
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/[0.09] px-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                Browse jobs <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
