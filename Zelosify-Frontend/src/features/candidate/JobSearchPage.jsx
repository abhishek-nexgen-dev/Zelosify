"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import LandingNavbar from "@/components/LandingPage/navbar/LandingNavbar";
import MarkdownContent from "@/components/content/MarkdownContent";
import { listJobs } from "@/features/candidate/api";

const PAGE_SIZE = 9;
const emptyFilters = { search: "", location: "" };
const fieldClass =
  "min-h-12 w-full rounded-xl border border-white/10 bg-[#050505]/70 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-lime-400 focus:ring-4 focus:ring-lime-500/15";

function experienceLabel(job) {
  const min = job.experienceMin;
  const max = job.experienceMax;
  if (min == null && max == null) return null;
  if (max == null) return `${min ?? 0}+ years`;
  return `${min ?? 0}–${max} years`;
}

function JobCard({ job }) {
  const skillList = Array.isArray(job.requiredSkills)
    ? job.requiredSkills.filter((skill) => typeof skill === "string" && skill.trim())
    : [];
  const skills = skillList.slice(0, 3);
  const extraSkills = Math.max(0, skillList.length - skills.length);
  const experience = experienceLabel(job);

  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] shadow-[0_12px_32px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-1 hover:border-lime-400/30 hover:bg-[#141414] hover:shadow-[0_18px_42px_rgba(30,41,90,.28)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-400/15 bg-lime-500/10 text-lime-200">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            {job.companyName && (
              <p className="truncate text-sm font-medium text-lime-200">{job.companyName}</p>
            )}
            <h2 className="mt-1 line-clamp-2 text-lg font-bold leading-snug tracking-[-0.02em] text-white sm:text-xl">
              {job.title}
            </h2>
          </div>
          <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" /> Open
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            {job.location || "Remote"}
          </span>
          {job.contractType && (
            <span className="inline-flex items-center gap-1.5">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              {job.contractType}
            </span>
          )}
          {experience && (
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              {experience}
            </span>
          )}
        </div>

        {job.description && (
          <MarkdownContent className="mt-4 line-clamp-2 [&_p]:text-sm [&_p]:leading-6">
            {job.description}
          </MarkdownContent>
        )}

        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Required skills">
            {skills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-medium text-slate-300"
              >
                {skill}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                +{extraSkills} more
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-white/[0.07] px-5 py-4 sm:px-6">
        <Link
          href={`/jobs/${encodeURIComponent(job.id)}`}
          className="group/link inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-xl bg-white/[0.045] px-4 text-sm font-semibold text-white transition hover:bg-lime-200/15 hover:text-lime-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400"
        >
          View job details{" "}
          <ArrowUpRight
            className="h-4 w-4 text-lime-300 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}

function JobCardSkeleton() {
  return (
    <div
      className="h-[18rem] animate-pulse rounded-2xl border border-white/[0.08] bg-[#0b0b0b]"
      aria-hidden="true"
    />
  );
}

export default function JobSearchPage({ initialFilters = emptyFilters }) {
  const normalizedInitial = {
    search: initialFilters.search || "",
    location: initialFilters.location || "",
  };
  const [form, setForm] = useState(normalizedInitial);
  const [filters, setFilters] = useState(normalizedInitial);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], pagination: { total: 0, totalPages: 1 } });
  const [state, setState] = useState({ loading: true, error: "" });
  const requestId = useRef(0);

  const loadJobs = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setState({ loading: true, error: "" });
    try {
      const response = await listJobs({
        page,
        limit: PAGE_SIZE,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.location ? { location: filters.location } : {}),
      });
      if (!response?.success || !Array.isArray(response.data)) {
        throw new Error("Unexpected jobs response");
      }
      if (requestId.current !== currentRequestId) return;
      const pagination = response.pagination || {};
      setResult({
        data: response.data,
        pagination: {
          page: pagination.page || page,
          limit: pagination.limit || PAGE_SIZE,
          total: Number.isFinite(pagination.total) ? pagination.total : response.data.length,
          totalPages: Number.isFinite(pagination.totalPages)
            ? Math.max(1, pagination.totalPages)
            : 1,
        },
      });
      setState({ loading: false, error: "" });
    } catch {
      if (requestId.current !== currentRequestId) return;
      setState({
        loading: false,
        error: "We couldn’t load jobs right now. Check your connection and try again.",
      });
    }
  }, [page, filters]);

  useEffect(() => {
    void loadJobs();
    return () => {
      requestId.current += 1;
    };
  }, [loadJobs]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setFilters({ search: form.search.trim(), location: form.location.trim() });
  };

  const clearFilters = () => {
    setForm(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  };

  const total = result.pagination.total;
  const hasFilters = Boolean(filters.search || filters.location);

  return (
    <div className="dark min-h-screen overflow-x-clip bg-[#050505] text-slate-100">
      <LandingNavbar />
      <main className="relative isolate min-h-screen overflow-hidden pb-16 pt-24 sm:pt-28">
        <div
          className="pointer-events-none absolute -top-48 right-[-7rem] -z-10 h-[34rem] w-[34rem] rounded-full bg-lime-600/10 blur-[110px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-[-12rem] top-[38rem] -z-10 h-[30rem] w-[30rem] rounded-full bg-lime-500/[0.07] blur-[110px]"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <header className="relative overflow-hidden rounded-[1.6rem] border border-white/[0.07] bg-gradient-to-br from-[#111111] via-[#080808] to-[#050505] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,.28)] sm:rounded-[2rem] sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            <div
              className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border-[36px] border-lime-400/[0.06]"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-lime-400/[0.06] blur-3xl"
              aria-hidden="true"
            />
            <div className="relative max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-400/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-lime-200 sm:text-[11px]">
                <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" /> Open opportunities
              </span>
              <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.06] tracking-[-0.05em] text-white sm:text-4xl lg:text-5xl">
                Find work that fits your next move.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                Search by role or location, compare the essentials, and open a listing when you’re
                ready to learn more.
              </p>

              <form
                onSubmit={submitSearch}
                className="mt-7 grid gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-3 backdrop-blur sm:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)_auto] sm:p-3.5"
              >
                <label className="sr-only" htmlFor="job-search">
                  Job title or keywords
                </label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="job-search"
                    className={`${fieldClass} pl-11`}
                    value={form.search}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, search: event.target.value }))
                    }
                    placeholder="Job title or keywords"
                    autoComplete="off"
                  />
                </div>
                <label className="sr-only" htmlFor="job-location">
                  City or location
                </label>
                <div className="relative">
                  <MapPin
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="job-location"
                    className={`${fieldClass} pl-11`}
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder="City or Remote"
                    autoComplete="address-level2"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-300 px-6 text-sm font-bold text-black shadow-lg shadow-lime-950/30 transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
                >
                  <Search className="h-4 w-4" aria-hidden="true" /> Search jobs
                </button>
              </form>

              <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" /> Search by title,
                description keywords, and location.
              </p>
            </div>
          </header>

          <section aria-labelledby="job-results-heading" className="mt-9 sm:mt-11">
            <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Your search results
                </p>
                <h2
                  id="job-results-heading"
                  className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl"
                >
                  {state.loading
                    ? "Finding opportunities"
                    : state.error
                      ? "Results unavailable"
                      : `${total} ${total === 1 ? "role" : "roles"} to explore`}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, search: "" }));
                      setFilters((current) => ({ ...current, search: "" }));
                      setPage(1);
                    }}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-300 hover:border-lime-300/30 hover:text-white"
                  >
                    “{filters.search}” <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {filters.location && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, location: "" }));
                      setFilters((current) => ({ ...current, location: "" }));
                      setPage(1);
                    }}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-slate-300 hover:border-lime-300/30 hover:text-white"
                  >
                    <MapPin className="h-3 w-3" aria-hidden="true" /> {filters.location}{" "}
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="min-h-8 px-2 text-xs font-semibold text-lime-300 hover:text-white"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            {state.error && (
              <div
                role="alert"
                className="mt-6 flex flex-col gap-4 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-5 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <p>{state.error}</p>
                <button
                  type="button"
                  onClick={() => void loadJobs()}
                  className="min-h-10 rounded-xl border border-rose-300/20 px-4 font-semibold text-rose-100 hover:bg-rose-300/10"
                >
                  Try again
                </button>
              </div>
            )}

            {state.loading && (
              <div
                className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                aria-label="Loading jobs"
              >
                {Array.from({ length: PAGE_SIZE }, (_, index) => (
                  <JobCardSkeleton key={index} />
                ))}
              </div>
            )}

            {!state.loading && !state.error && result.data.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-white/[0.13] bg-[#0b0b0b]/70 px-6 py-16 text-center sm:py-20">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
                  <BriefcaseBusiness className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">
                  No open roles match those filters
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
                  Try a broader keyword or another location to see more opportunities.
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white transition hover:border-lime-300/30 hover:bg-white/[0.04]"
                  >
                    Clear filters <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {!state.loading && !state.error && result.data.length > 0 && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
                {result.data.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}

            {!state.loading && !state.error && result.pagination.totalPages > 1 && (
              <nav
                aria-label="Job results pages"
                className="mt-9 flex flex-col gap-4 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <p className="text-sm text-slate-400">
                  Page <span className="font-semibold text-white">{page}</span> of{" "}
                  <span className="font-semibold text-white">{result.pagination.totalPages}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-lime-300/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= result.pagination.totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(result.pagination.totalPages, current + 1))
                    }
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:border-lime-300/25 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                  >
                    Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </nav>
            )}
          </section>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="text-sm font-semibold text-white">
                Want to keep track of roles you apply for?
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Create a candidate profile to manage your applications in one place.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-lime-300/20 bg-lime-400/[0.08] px-4 text-sm font-semibold text-lime-100 transition hover:bg-lime-200/[0.14]"
            >
              Create profile <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
