"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";
import { fetchInternalDashboard } from "@/features/internal-dashboard/api";
import { canCreateTeamMember, hasPermission } from "@/features/auth/permissions";

const roleCopy = {
  ADMIN: {
    label: "Administrator",
    description:
      "Your organization’s recruiting operations, team access, and openings at a glance.",
  },
  RECRUITER: {
    label: "Recruiter",
    description: "A focused view of your organization’s openings and candidate activity.",
  },
  HIRING_MANAGER: {
    label: "Hiring manager",
    description: "Your openings and candidate activity, together in one workspace.",
  },
  IT_VENDOR: {
    label: "IT vendor",
    description: "Open contract opportunities and the tools you need to submit candidates.",
  },
};

const actionsByRole = {
  ADMIN: [
    {
      title: "Manage openings",
      description: "Review and update roles across your tenant.",
      href: "/recruiter/jobs",
      icon: BriefcaseBusiness,
    },
    {
      title: "Recruiting team",
      description: "View recruiter and hiring manager accounts.",
      href: "/admin/recruiters",
      icon: Users,
    },
  ],
  RECRUITER: [
    {
      title: "Manage openings",
      description: "Create roles and review candidate pipelines.",
      href: "/recruiter/jobs",
      icon: BriefcaseBusiness,
    },
    {
      title: "Candidate review",
      description: "Open applicants and review recommendations.",
      href: "/recruiter/jobs",
      icon: ClipboardCheck,
    },
  ],
  HIRING_MANAGER: [
    {
      title: "My openings",
      description: "Manage roles assigned to your account.",
      href: "/hiring-manager/openings",
      icon: BriefcaseBusiness,
    },
    {
      title: "Candidate review",
      description: "Review applicants for your openings.",
      href: "/hiring-manager/openings",
      icon: ClipboardCheck,
    },
  ],
  IT_VENDOR: [
    {
      title: "Contract openings",
      description: "Find roles open for vendor submissions.",
      href: "/vendor/openings",
      icon: BriefcaseBusiness,
    },
  ],
};

function MetricCard({ label, value, detail, icon: Icon, accent }) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111111] to-[#0d1018] p-5 shadow-[0_18px_55px_-35px_rgba(0,0,0,0.8)] transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] sm:p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-lime-500/[0.06] blur-3xl transition group-hover:bg-lime-200/[0.12]"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{detail}</p>
        </div>
        <span className={`relative rounded-xl p-3 ring-1 ring-inset ring-white/[0.06] ${accent}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}

export default function InternalDashboardPage() {
  const { user, getDisplayName } = useAuth();
  const [dashboard, setDashboard] = useState({
    recentOpenings: [],
    summary: {
      openingCount: 0,
      applicantCount: null,
      teamAccountCount: null,
      ownSubmissionCount: null,
    },
  });
  const [state, setState] = useState({ loading: true, error: "" });
  const requestId = useRef(0);
  const role = user?.role;

  const loadDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState({ loading: true, error: "" });
    try {
      const response = await fetchInternalDashboard();

      if (requestId.current !== currentRequest) return;
      setDashboard({
        recentOpenings: Array.isArray(response?.recentOpenings) ? response.recentOpenings : [],
        summary: response?.summary || {
          openingCount: 0,
          applicantCount: null,
          teamAccountCount: null,
          ownSubmissionCount: null,
        },
      });
      setState({ loading: false, error: "" });
    } catch {
      if (requestId.current === currentRequest) {
        setState({
          loading: false,
          error: "Dashboard data could not be loaded. Please try again.",
        });
      }
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
    return () => {
      requestId.current += 1;
    };
  }, [loadDashboard]);

  const roleDetails = roleCopy[role] || roleCopy.RECRUITER;
  const canViewCandidates = hasPermission(user, "CANDIDATES_VIEW");
  const canViewJobs = hasPermission(user, "JOBS_VIEW");
  const metrics =
    role === "IT_VENDOR"
      ? [
          {
            label: "Open opportunities",
            value: dashboard.summary.openingCount,
            detail: "Available to your tenant",
            icon: BriefcaseBusiness,
            accent: "bg-violet-500/10 text-violet-300",
          },
          {
            label: "My submissions",
            value: dashboard.summary.ownSubmissionCount ?? 0,
            detail: "Active candidate submissions",
            icon: ClipboardCheck,
            accent: "bg-lime-500/10 text-lime-300",
          },
        ]
      : [
          ...(canViewJobs
            ? [
                {
                  label: "Managed openings",
                  value: dashboard.summary.openingCount,
                  detail: role === "HIRING_MANAGER" ? "Assigned to you" : "In your tenant",
                  icon: BriefcaseBusiness,
                  accent: "bg-lime-500/10 text-lime-300",
                },
              ]
            : []),
          ...(canViewCandidates && canViewJobs
            ? [
                {
                  label: "Applicants across openings",
                  value:
                    dashboard.summary.applicantCount ?? dashboard.summary.recentApplicantCount ?? 0,
                  detail: "Across all openings in your access scope",
                  icon: ClipboardCheck,
                  accent: "bg-emerald-500/10 text-emerald-300",
                },
              ]
            : []),
          ...(role === "ADMIN"
            ? [
                {
                  label: "Team accounts",
                  value: dashboard.summary.teamAccountCount ?? "—",
                  detail: "Recruiters, hiring managers, and vendors",
                  icon: Users,
                  accent: "bg-violet-500/10 text-violet-300",
                },
              ]
            : []),
        ];
  const actions = (actionsByRole[role] || []).filter(({ title }) => {
    if (title.toLowerCase().includes("opening")) return hasPermission(user, "JOBS_VIEW");
    if (title.toLowerCase().includes("candidate")) return hasPermission(user, "CANDIDATES_VIEW");
    if (title.toLowerCase().includes("team")) return hasPermission(user, "TEAM_VIEW");
    return true;
  });

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-9 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-8 lg:space-y-10">
        <section className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#111111] via-[#0b0b0b] to-[#0b0b0b] p-6 text-white shadow-[0_28px_80px_-45px_rgba(36,47,82,0.8)] sm:rounded-[2rem] sm:p-9 lg:p-11">
          <div
            className="pointer-events-none absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full bg-lime-500/15 blur-[100px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-40 left-1/3 -z-10 h-80 w-80 rounded-full bg-cyan-500/[0.08] blur-[100px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.055)_1px,transparent_0)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom_right,black,transparent_75%)]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.08] px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-lime-100 sm:text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" /> INTERNAL
                WORKSPACE
              </span>
              <p className="mt-7 text-sm font-semibold text-lime-200">{roleDetails.label}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] sm:text-4xl lg:text-[3.25rem] lg:leading-[1.05]">
                Welcome back, {getDisplayName() || user?.username || "there"}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                {roleDetails.description}
              </p>
              {user?.tenant?.companyName && (
                <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/20 px-3.5 py-2 text-xs font-medium text-slate-300 sm:text-sm">
                  <Building2 className="h-4 w-4 text-cyan-200" aria-hidden="true" />{" "}
                  {user.tenant.companyName}
                </p>
              )}
            </div>
            {canCreateTeamMember(user) && (
              <Link
                href="/admin/recruiters/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-[#0b0b0b] px-5 py-3 text-sm font-bold text-slate-50 shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:self-auto"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />{" "}
                {role === "HIRING_MANAGER" ? "Create recruiter" : "Create team member"}
              </Link>
            )}
          </div>
        </section>

        {state.error && (
          <section
            role="alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4 text-sm text-rose-100"
          >
            <p>{state.error}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="min-h-9 rounded-lg px-3 font-semibold underline underline-offset-4 hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </section>
        )}

        {metrics.length > 0 && (
          <section
            aria-label="Workspace summary"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {state.loading
              ? [0, 1, ...(role === "ADMIN" ? [2] : [])].map((item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111]"
                  />
                ))
              : metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
          </section>
        )}

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300 sm:text-[11px]">
                Your workspace
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Quick actions
              </h2>
            </div>
          </div>
          {actions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {actions.map(({ title, description, href, icon: Icon }) => (
                <Link
                  key={title}
                  href={href}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-[0_15px_45px_-35px_rgba(0,0,0,0.9)] transition duration-200 hover:-translate-y-1 hover:border-lime-300/30 hover:bg-[#141414] hover:shadow-[0_24px_55px_-35px_rgba(79,70,229,0.45)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:p-6"
                >
                  <span className="inline-flex rounded-xl bg-lime-400/[0.12] p-3 text-lime-200 ring-1 ring-inset ring-lime-300/[0.12] transition group-hover:bg-lime-200/[0.2]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 flex items-center justify-between gap-3 font-semibold">
                    {title}
                    <ArrowRight
                      className="h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-lime-200"
                      aria-hidden="true"
                    />
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] px-5 py-8 text-sm text-slate-400">
              Your account does not currently have workspace actions assigned.
            </div>
          )}
        </section>

        {canViewJobs && (
          <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.95)] sm:rounded-3xl sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime-300 sm:text-[11px]">
                  Latest activity
                </p>
                <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Recent openings
                </h2>
              </div>
              <Link
                href={
                  role === "IT_VENDOR"
                    ? "/vendor/openings"
                    : role === "HIRING_MANAGER"
                      ? "/hiring-manager/openings"
                      : "/recruiter/jobs"
                }
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-lime-200 transition hover:bg-white/[0.05] hover:text-white"
              >
                View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            {state.loading ? (
              <div className="mt-5 space-y-3" role="status" aria-label="Loading recent openings">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
                ))}
              </div>
            ) : dashboard.recentOpenings.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] px-5 py-12 text-center">
                <BriefcaseBusiness className="mx-auto h-7 w-7 text-slate-500" aria-hidden="true" />
                <p className="mt-3 font-medium text-slate-200">No openings to show yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  New roles will appear here when they are available.
                </p>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-white/[0.06]">
                {dashboard.recentOpenings.slice(0, 6).map((opening) => (
                  <li
                    key={opening.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-4 first:pt-2 last:pb-2 sm:px-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-100">{opening.title}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {[opening.companyName, opening.location, opening.hiringManagerName]
                          .filter(Boolean)
                          .join(" · ") ||
                          opening.location ||
                          "Opening details"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {typeof opening.applicantsCount === "number" && (
                        <span className="text-xs text-slate-500">
                          {opening.applicantsCount} applicants
                        </span>
                      )}
                      <span className="rounded-full border border-emerald-300/10 bg-emerald-300/[0.08] px-3 py-1 text-xs font-semibold text-emerald-200">
                        {opening.status || "OPEN"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
