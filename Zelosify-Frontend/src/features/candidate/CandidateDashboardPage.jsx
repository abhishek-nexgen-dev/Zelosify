"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Search,
  UserRound,
} from "lucide-react";
import { getApplications } from "@/features/candidate/api";
import useAuth from "@/hooks/Auth/useAuth";

const metricConfig = [
  {
    key: "total",
    label: "Applications",
    detail: "Roles you have applied to",
    icon: FileCheck2,
    tone: "bg-lime-300/[0.08] text-lime-200",
  },
  {
    key: "inReview",
    label: "In review",
    detail: "Waiting for a team update",
    icon: Activity,
    tone: "bg-sky-400/10 text-sky-200",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    detail: "Moving forward in the process",
    icon: CheckCircle2,
    tone: "bg-emerald-400/10 text-emerald-200",
  },
  {
    key: "screening",
    label: "Resume analysis",
    detail: "Currently being reviewed by AI",
    icon: LoaderCircle,
    tone: "bg-violet-400/10 text-violet-200",
  },
];

function applicationStatusStyle(status) {
  if (status === "SHORTLISTED")
    return "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200";
  if (status === "REJECTED") return "border-rose-300/15 bg-rose-300/[0.08] text-rose-200";
  return "border-sky-300/15 bg-sky-300/[0.08] text-sky-200";
}

function applicationStatusLabel(status) {
  return (
    {
      SUBMITTED: "Submitted",
      SHORTLISTED: "Shortlisted",
      REJECTED: "Not selected",
    }[status] ||
    status ||
    "Submitted"
  );
}

function screeningLabel(status) {
  return (
    {
      PENDING: "Queued for analysis",
      PROCESSING: "Analyzing resume",
      COMPLETED: "Analysis complete",
      FAILED: "Analysis unavailable",
    }[status] || "Analysis pending"
  );
}

function MetricCard({ metric, value }) {
  const Icon = metric.icon;
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition hover:-translate-y-0.5 hover:border-white/[0.15] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">{metric.label}</p>
          <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
        </div>
        <span className={`rounded-xl p-3 ring-1 ring-inset ring-white/[0.06] ${metric.tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

export default function CandidateDashboardPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [summary, setSummary] = useState({ total: 0, inReview: 0, shortlisted: 0, screening: 0 });
  const [state, setState] = useState("loading");
  const requestController = useRef(null);

  const loadApplications = useCallback(async () => {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    setState("loading");
    try {
      const data = await getApplications({ limit: 5 }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setApps(Array.isArray(data.data) ? data.data : []);
      setSummary(
        data.summary || { total: data.count || 0, inReview: 0, shortlisted: 0, screening: 0 }
      );
      setState("ready");
    } catch {
      if (!controller.signal.aborted) setState("error");
    }
  }, []);

  useEffect(() => {
    if (user?.role !== "CANDIDATE") return undefined;
    void loadApplications();
    return () => {
      requestController.current?.abort();
    };
  }, [user?.id, user?.role, loadApplications]);

  const firstName = user?.firstName?.trim();
  const metrics = metricConfig.map((metric) => ({
    ...metric,
    value: summary[metric.key] ?? 0,
  }));

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">
        <section className="relative isolate overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-[0_28px_80px_-50px_rgba(0,0,0,0.95)] sm:rounded-[1.75rem] sm:p-9 lg:p-11">
          <div
            className="pointer-events-none absolute -right-16 -top-32 -z-10 h-80 w-80 rounded-full bg-lime-300/[0.07] blur-[100px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-40 left-1/3 -z-10 h-72 w-72 rounded-full bg-white/[0.025] blur-[100px]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-300/[0.06] px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-lime-100 sm:text-[11px]">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-lime-200" aria-hidden="true" />{" "}
                CANDIDATE DASHBOARD
              </span>
              <h1 className="mt-6 text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl lg:text-[3.25rem] lg:leading-[1.05]">
                Welcome{firstName ? `, ${firstName}` : " back"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Keep your applications, resume progress, and next career move together in one place.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-slate-400">
                <span className="rounded-full border border-white/[0.08] bg-[#111111] px-3 py-2">
                  {summary.total} application{summary.total === 1 ? "" : "s"}
                </span>
                {summary.screening > 0 && (
                  <span className="rounded-full border border-violet-300/10 bg-violet-300/[0.06] px-3 py-2 text-violet-200">
                    {summary.screening} resume{summary.screening === 1 ? " is" : "s are"} being
                    analyzed
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
              <Link
                href="/jobs"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-lime-950/20 transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                <Search className="h-4 w-4" aria-hidden="true" /> Find jobs{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/candidate/profile"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
              >
                <UserRound className="h-4 w-4" aria-hidden="true" /> My profile
              </Link>
            </div>
          </div>
        </section>

        {state === "error" && (
          <section
            role="alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4 text-sm text-rose-100"
          >
            <p>Your applications could not be loaded.</p>
            <button
              type="button"
              onClick={loadApplications}
              className="min-h-9 rounded-lg px-3 font-semibold underline underline-offset-4 hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </section>
        )}

        <section
          aria-label="Application summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {state === "loading"
            ? metricConfig.map((metric) => (
                <div
                  key={metric.key}
                  className="h-36 animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111]"
                />
              ))
            : metrics.map((metric) => (
                <MetricCard key={metric.key} metric={metric} value={metric.value} />
              ))}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.95)] sm:rounded-3xl sm:p-6 lg:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200 sm:text-[11px]">
                Your recent activity
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Recent applications
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Check your application status and resume analysis.
              </p>
            </div>
            <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:w-auto sm:justify-end">
              {state === "ready" && summary.total > 0 && (
                <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
                  Showing {apps.length} of {summary.total}
                </span>
              )}
              <Link
                href="/candidate/applications"
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-lime-100 transition hover:bg-white/[0.05] hover:text-white"
              >
                All applications <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {state === "loading" ? (
            <div className="mt-6 space-y-3" role="status" aria-label="Loading recent applications">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-24 animate-pulse rounded-2xl bg-[#111111]" />
              ))}
            </div>
          ) : apps.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/[0.1] bg-[#080808] px-5 py-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#111111] text-slate-400">
                <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-slate-100">
                Your next opportunity starts here
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                When you apply, your application status and resume analysis will appear here.
              </p>
              <Link
                href="/jobs"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-bold text-black transition hover:bg-lime-200"
              >
                Browse open jobs <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {apps.slice(0, 5).map((app) => (
                <article
                  key={app.applicationId}
                  className="group rounded-2xl border border-white/[0.07] bg-[#090909] p-4 transition hover:border-lime-300/20 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {app.jobTitle || "Job application"}
                      </h3>
                      <p className="mt-1 truncate text-sm text-slate-400">
                        {[app.companyName, app.location].filter(Boolean).join(" · ") ||
                          "Opening details"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${applicationStatusStyle(app.status)}`}
                    >
                      {applicationStatusLabel(app.status)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] pt-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />{" "}
                      Applied{" "}
                      {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : "—"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${app.screeningStatus === "COMPLETED" ? "bg-emerald-300" : app.screeningStatus === "FAILED" ? "bg-rose-300" : "bg-violet-300"}`}
                        aria-hidden="true"
                      />
                      {screeningLabel(app.screeningStatus)}
                    </span>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Link
                      href={`/applications/${app.applicationId}/score`}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-lime-300/20 bg-lime-300/[0.06] px-3 text-xs font-semibold text-lime-100 transition hover:bg-lime-300/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
                    >
                      View score{" "}
                      <ArrowRight
                        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
