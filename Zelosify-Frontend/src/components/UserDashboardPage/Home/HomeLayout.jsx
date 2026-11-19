"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  FileUp,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

const journeys = {
  IT_VENDOR: {
    eyebrow: "Vendor workspace",
    title: "Your next great match starts here.",
    description:
      "Explore active contract roles, share candidate profiles securely, and follow each submission from one place.",
    primary: { label: "Explore openings", href: "/vendor/openings", icon: BriefcaseBusiness },
    secondary: { label: "Upload a candidate", href: "/vendor/openings", icon: FileUp },
  },
  HIRING_MANAGER: {
    eyebrow: "Hiring workspace",
    title: "Make every candidate review count.",
    description:
      "See the roles assigned to you, compare clear recommendations, and move promising candidates forward.",
    primary: {
      label: "Review my openings",
      href: "/hiring-manager/openings",
      icon: BriefcaseBusiness,
    },
    secondary: { label: "View candidates", href: "/hiring-manager/openings", icon: UsersRound },
  },
  DEFAULT: {
    eyebrow: "Your Zelosify workspace",
    title: "A clearer way to move hiring forward.",
    description:
      "Bring vendors, hiring teams, and candidate reviews together in one secure workspace.",
    primary: { label: "Explore openings", href: "/vendor/openings", icon: BriefcaseBusiness },
    secondary: { label: "Open workspace", href: "/login", icon: ArrowRight },
  },
};

const benefits = [
  {
    icon: ShieldCheck,
    title: "Secure by design",
    description: "Your workspace keeps access scoped to the right people and teams.",
    color: "blue",
  },
  {
    icon: Sparkles,
    title: "Thoughtful recommendations",
    description: "Review candidate insights with clear scores and useful context.",
    color: "violet",
  },
  {
    icon: UsersRound,
    title: "One connected workflow",
    description: "Keep vendors and hiring managers aligned from role to decision.",
    color: "teal",
  },
];

export default function HomeLayout() {
  const [role, setRole] = useState("DEFAULT");
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    const roleCookie = document.cookie.match(/(?:^|; )role=([^;]*)/)?.[1];
    if (roleCookie && journeys[decodeURIComponent(roleCookie)]) {
      setRole(decodeURIComponent(roleCookie));
    }
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setFirstName(user.firstName || user.name?.split(" ")[0] || "");
    } catch {
      setFirstName("");
    }
  }, []);

  const content = journeys[role] || journeys.DEFAULT;
  const PrimaryIcon = content.primary.icon;
  const SecondaryIcon = content.secondary.icon;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {}
      <section className="relative overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-10 lg:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-[#101318] px-3 py-1 text-xs font-semibold text-lime-300 dark:border-lime-900 dark:bg-lime-950 dark:text-lime-300">
              <Sparkles className="h-3.5 w-3.5 text-lime-300 dark:text-lime-400" />
              {content.eyebrow}
            </div>

            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-100 dark:text-white sm:text-3xl lg:text-4xl">
              {firstName ? `Welcome back, ${firstName}.` : content.title}
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-slate-300 dark:text-slate-400 sm:text-base">
              {content.description}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={content.primary.href}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 text-xs font-semibold text-black shadow-sm transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                <PrimaryIcon className="h-4 w-4" />
                {content.primary.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={content.secondary.href}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] border border-white/[0.08] bg-[#0b0b0b] px-5 text-xs font-semibold text-slate-200 shadow-sm transition hover:bg-[#0b0b0b] dark:border-slate-700 dark:bg-[#171717] dark:text-slate-200 dark:hover:bg-[#1d1d1d]"
              >
                <SecondaryIcon className="h-4 w-4" />
                {content.secondary.label}
              </Link>
            </div>
          </div>

          {}
          <div className="rounded-[10px] border border-white/[0.06] bg-[#0b0b0b] p-5 dark:border-slate-800 dark:bg-[#050505]/50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Workspace Highlights
            </p>
            <div className="mt-3 space-y-2.5">
              <div className="flex items-start gap-2.5 text-xs text-slate-200 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Deterministic scoring for complete audit transparency</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Secure candidate resume uploads with presigned S3 URLs</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Tenant isolation and role boundaries verified server-side</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {}
      <section className="mt-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-lime-300 dark:text-lime-400">
            Built for Better Outcomes
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-100 dark:text-white sm:text-2xl">
            Everything in sync, from role to decision.
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            A focused workspace designed to make the hiring process easier to follow and simpler to
            act on.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description, color }) => (
            <article
              key={title}
              className="rounded-[10px] border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm transition hover:border-slate-700 hover:shadow-md dark:border-slate-800 dark:bg-[#0b0b0b] dark:hover:border-slate-700"
            >
              <div
                className={`home-benefit-icon home-${color} flex h-10 w-10 items-center justify-center rounded-[8px]`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-100 dark:text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <ShieldCheck className="h-4 w-4 text-slate-400" />
        <span>Secure access for your organization</span>
      </div>
    </div>
  );
}
