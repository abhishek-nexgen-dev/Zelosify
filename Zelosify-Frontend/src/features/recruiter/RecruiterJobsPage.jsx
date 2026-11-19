"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  Eye,
  MapPin,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";
import Pagination from "@/components/recruitment/Pagination";
import { formatDate } from "@/components/recruitment/format";
import { getManagedJobs } from "@/features/recruiter/api";
import { hasPermission } from "@/features/auth/permissions";

const PAGE_SIZE = 10;
const statuses = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "ON_HOLD", label: "On hold" },
];

const statusStyle = {
  OPEN: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  CLOSED: "border-slate-500/25 bg-slate-500/10 text-slate-300",
  ON_HOLD: "border-amber-400/20 bg-amber-400/10 text-amber-200",
};

function StatusPill({ status }) {
  const label = status === "ON_HOLD" ? "On hold" : status === "OPEN" ? "Open" : "Closed";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle[status] || statusStyle.CLOSED}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

function experienceRange(job) {
  const minimum = job.experienceMin ?? 0;
  return job.experienceMax == null ? `${minimum}+ years` : `${minimum}–${job.experienceMax} years`;
}

function JobViewLink({ job }) {
  return (
    <Link
      href={`/recruiter/jobs/${encodeURIComponent(job.id)}`}
      aria-label={`View ${job.title}`}
      title="View opening"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-lime-300/30 hover:bg-lime-300/10 hover:text-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}

function MobileJobCard({ job, canViewCandidates }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-4 shadow-[0_15px_45px_-35px_rgba(0,0,0,0.9)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{job.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{job.contractType || "Full-time"}</p>
        </div>
        <StatusPill status={job.status} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.07] pt-4 text-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Location
          </p>
          <p className="mt-1 flex items-center gap-1.5 truncate text-slate-200">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
            {job.location || "Remote"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Experience
          </p>
          <p className="mt-1 text-slate-200">{experienceRange(job)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Posted
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-slate-300">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            {formatDate(job.postedDate)}
          </p>
        </div>
        {canViewCandidates && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Applicants
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-semibold text-slate-200">
              <Users className="h-3.5 w-3.5 text-lime-300" aria-hidden="true" />
              {job.applicantsCount ?? 0}
            </p>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3">
        <span className="text-xs text-slate-500">Opening details</span>
        <JobViewLink job={job} />
      </div>
    </article>
  );
}

export default function RecruiterJobsPage() {
  const { user } = useAuth();
  const canManageJobsRole = ["ADMIN", "RECRUITER"].includes(user?.role);
  const canViewJobs = canManageJobsRole && hasPermission(user, "JOBS_VIEW");
  const canCreateJobs = canManageJobsRole && hasPermission(user, "JOBS_CREATE");
  const canViewCandidates =
    user?.role !== "IT_VENDOR" && canManageJobsRole && hasPermission(user, "CANDIDATES_VIEW");
  const [status, setStatus] = useState("OPEN");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState({
    data: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
  });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: "" });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState({ loading: true, error: "" });
    try {
      const response = await getManagedJobs({
        page,
        limit: PAGE_SIZE,
        status,
        ...(search ? { search } : {}),
      });
      if (requestId.current !== currentRequest) return;
      const rows = Array.isArray(response?.data) ? response.data : [];
      const pagination = response?.pagination || {
        page,
        limit: PAGE_SIZE,
        total: rows.length,
        totalPages: 1,
      };
      setData({ data: rows, pagination });
      setPage(pagination.page || page);
      setState({ loading: false, error: "" });
    } catch {
      if (requestId.current === currentRequest) {
        setState({
          loading: false,
          error: "Job openings could not be loaded. Check your connection and try again.",
        });
      }
    }
  }, [page, search, status]);

  useEffect(() => {
    if (canViewJobs) void load();
    return () => {
      requestId.current += 1;
    };
  }, [canViewJobs, load, user?.id, user?.role]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  if (!user) return <main className="p-8 text-slate-200">Sign in to manage jobs.</main>;
  if (!canViewJobs)
    return (
      <main className="p-8 text-slate-200">You do not have permission to manage job openings.</main>
    );

  const total = data.pagination?.total ?? data.data.length;
  const firstResult = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastResult = Math.min(page * PAGE_SIZE, total);
  const selectedStatusLabel =
    statuses.find((item) => item.value === status)?.label.toLowerCase() || "open";

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-9 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-6 lg:space-y-7">
        <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#111111] via-[#0b0b0b] to-[#0b0b0b] p-6 shadow-[0_28px_80px_-45px_rgba(36,47,82,0.8)] sm:rounded-[2rem] sm:p-9">
          <div
            className="pointer-events-none absolute -right-20 -top-28 -z-10 h-80 w-80 rounded-full bg-lime-500/15 blur-[90px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-cyan-500/[0.08] blur-[90px]"
            aria-hidden="true"
          />
          <div className="relative flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.08] px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-lime-100 sm:text-[11px]">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" />{" "}
                RECRUITING WORKSPACE
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl">
                Job openings
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Keep roles, hiring activity, and applicant progress organized in one place.
              </p>
            </div>
            {canCreateJobs && (
              <Link
                href="/recruiter/jobs/new"
                className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-xl bg-[#0b0b0b] px-5 py-3 text-sm font-bold text-slate-50 shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 hover:bg-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-auto"
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Create opening{" "}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-4 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.95)] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div
              className="flex w-full gap-1 rounded-xl border border-white/[0.07] bg-[#0b0b0b] p-1 sm:w-auto"
              role="group"
              aria-label="Filter openings by status"
            >
              {statuses.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={status === item.value}
                  onClick={() => {
                    setStatus(item.value);
                    setPage(1);
                  }}
                  className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition sm:flex-none sm:px-4 ${status === item.value ? "bg-lime-400/15 text-lime-100 shadow-sm ring-1 ring-inset ring-lime-300/15" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form onSubmit={submitSearch} role="search" className="flex w-full gap-2 xl:max-w-xl">
              <label htmlFor="managed-job-search" className="sr-only">
                Search openings by title or description
              </label>
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden="true"
                />
                <input
                  id="managed-job-search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search title or description"
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b0b0b] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-300/50 focus:ring-4 focus:ring-lime-500/10"
                />
              </div>
              <button
                type="submit"
                disabled={state.loading}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Search</span>
              </button>
              {(search || searchInput) && (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label="Clear search"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.08] text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </form>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.07] pt-4 text-sm">
            <p className="font-semibold text-slate-200">
              {state.loading
                ? "Loading openings…"
                : `${total} ${selectedStatusLabel} opening${total === 1 ? "" : "s"}`}
            </p>
            {!state.loading && total > 0 && (
              <p className="text-xs text-slate-500">
                Showing {firstResult}–{lastResult} of {total}
              </p>
            )}
          </div>
        </section>

        {state.error && (
          <section
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4 text-sm text-rose-100"
          >
            <span>{state.error}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-9 rounded-lg px-3 font-semibold underline underline-offset-4 hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] shadow-[0_20px_60px_-42px_rgba(0,0,0,0.95)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-white">Openings directory</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select an opening to review its details and team.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
              <Users className="h-3.5 w-3.5 text-lime-300" aria-hidden="true" /> Scoped to your
              access
            </span>
          </div>

          {state.loading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading job openings">
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-16 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ) : !state.error && data.data.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-200 ring-1 ring-inset ring-lime-300/10">
                <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold text-white">
                {search ? "No matching openings" : `No ${selectedStatusLabel} openings`}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                {search
                  ? "Try another title or description keyword."
                  : "Create an opening to start receiving applications."}
              </p>
              {!search && status === "OPEN" && canCreateJobs && (
                <Link
                  href="/recruiter/jobs/new"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-black hover:bg-lime-200"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> Create opening
                </Link>
              )}
            </div>
          ) : !state.error ? (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left">
                  <thead className="bg-[#0c1018] text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-bold">
                        Opening
                      </th>
                      <th scope="col" className="px-4 py-4 font-bold">
                        Location
                      </th>
                      <th scope="col" className="px-4 py-4 font-bold">
                        Experience
                      </th>
                      <th scope="col" className="px-4 py-4 font-bold">
                        Posted
                      </th>
                      {canViewCandidates && (
                        <th scope="col" className="px-4 py-4 font-bold">
                          Applicants
                        </th>
                      )}
                      <th scope="col" className="px-4 py-4 font-bold">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-4 text-right font-bold">
                        View
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {data.data.map((job) => (
                      <tr key={job.id} className="transition hover:bg-white/[0.025]">
                        <td className="max-w-[380px] px-6 py-4">
                          <p className="truncate font-semibold text-slate-100">{job.title}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {job.contractType || "Full-time"}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">
                          <span className="inline-flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                            {job.location || "Remote"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300">{experienceRange(job)}</td>
                        <td className="px-4 py-4 text-sm text-slate-400">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays
                              className="h-3.5 w-3.5 text-slate-500"
                              aria-hidden="true"
                            />
                            {formatDate(job.postedDate)}
                          </span>
                        </td>
                        {canViewCandidates && (
                          <td className="px-4 py-4 text-sm font-semibold text-slate-200">
                            {job.applicantsCount ?? 0}
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <StatusPill status={job.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex justify-end">
                            <JobViewLink job={job} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-3 md:hidden">
                {data.data.map((job) => (
                  <MobileJobCard key={job.id} job={job} canViewCandidates={canViewCandidates} />
                ))}
              </div>
            </>
          ) : null}
        </section>

        {!state.loading && !state.error && (
          <Pagination
            page={page}
            totalPages={data.pagination?.totalPages || 1}
            onPageChange={setPage}
            disabled={state.loading}
          />
        )}
      </div>
    </main>
  );
}
