"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  LayoutList,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import useVendorOpenings from "@/hooks/Dashboard/Vendor/useVendorOpenings";
import MarkdownContent from "@/components/content/MarkdownContent";
import Pagination from "@/components/recruitment/Pagination";
import { EmptyState, ErrorState } from "@/components/recruitment/StateMessage";
import { formatDate, getId } from "@/components/recruitment/format";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import { Button } from "@/components/UI/shadcn/button";

const PAGE_SIZE = 10;
const EXPERIENCE_FILTERS = [
  { value: "", label: "Any experience" },
  { value: "0-2", label: "0–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "6+", label: "6+ years" },
];
const CONTRACT_TYPES = ["Full-Time", "Contract", "Part-Time", "Internship"];

function experienceLabel(opening) {
  const min = opening.experienceMin ?? opening.minExperience;
  const max = opening.experienceMax ?? opening.maxExperience;
  if (min == null && max == null) return null;
  if (max == null) return `${min}+ years`;
  if (min == null) return `Up to ${max} years`;
  return `${min}–${max} years`;
}

function OpeningCard({ opening }) {
  const id = getId(opening);
  const experience = experienceLabel(opening);
  const manager = opening.hiringManagerName || opening.hiringManager?.name || opening.managerName;
  return (
    <article className="explore-job-card group flex h-full flex-col rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition duration-200 hover:-translate-y-1 hover:border-lime-300/15 hover:shadow-lg hover:shadow-slate-900/[.06] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0b0b0b] text-slate-500">
          {opening.companyLogo || opening.company?.logo ? (
            <img
              src={opening.companyLogo || opening.company.logo}
              alt=""
              className="h-full w-full rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <Building2 className="h-5 w-5" aria-hidden="true" />
          )}
        </div>
        {opening.status ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            {String(opening.status).replaceAll("_", " ")}
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">
        {opening.companyName || opening.company?.name || "Contract opportunity"}
      </p>
      <h2 className="mt-1.5 text-lg font-semibold leading-snug tracking-tight text-slate-100 group-hover:text-lime-300">
        {opening.title || "Untitled opening"}
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {opening.location ? (
          <span className="job-chip">
            <MapPin className="h-3.5 w-3.5" />
            {opening.location}
          </span>
        ) : null}
        {opening.contractType ? (
          <span className="job-chip">
            <BriefcaseBusiness className="h-3.5 w-3.5" />
            {opening.contractType}
          </span>
        ) : null}
        {experience ? <span className="job-chip">{experience}</span> : null}
      </div>
      {opening.description ? (
        <MarkdownContent className="mt-4 line-clamp-2 [&_p]:text-sm [&_p]:leading-6">
          {opening.description}
        </MarkdownContent>
      ) : (
        <div className="flex-1" />
      )}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="min-w-0 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(opening.postedDate || opening.createdAt)}
          </span>
          {manager ? <span className="mt-1 block truncate">Hiring manager · {manager}</span> : null}
        </div>
        <Link
          href={`/vendor/openings/${id}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-lime-300 px-3.5 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-600"
        >
          View job{" "}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}

function JobCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="mt-5 h-3 w-28" />
      <Skeleton className="mt-3 h-6 w-3/4" />
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-7 h-10 w-full" />
    </div>
  );
}

function OpeningTableSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

function OpeningTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0b0b] shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] bg-[#0b0b0b] text-xs font-semibold uppercase tracking-wider text-slate-300">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Title
              </th>
              <th scope="col" className="px-5 py-3.5">
                Location
              </th>
              <th scope="col" className="px-5 py-3.5">
                Contract Type
              </th>
              <th scope="col" className="px-5 py-3.5">
                Posted Date
              </th>
              <th scope="col" className="px-5 py-3.5">
                Hiring Manager
              </th>
              <th scope="col" className="px-5 py-3.5 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.08]">
            {rows.map((opening) => {
              const id = getId(opening);
              const manager =
                opening.hiringManagerName ||
                opening.hiringManager?.name ||
                opening.managerName ||
                "—";
              return (
                <tr key={id} className="transition-colors hover:bg-[#0b0b0b]">
                  <td className="px-5 py-4">
                    <Link
                      href={`/vendor/openings/${id}`}
                      className="font-medium text-slate-100 hover:text-lime-300 hover:underline"
                    >
                      {opening.title || "Untitled opening"}
                    </Link>
                    {opening.companyName || opening.company?.name ? (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {opening.companyName || opening.company?.name}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <div className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {opening.location || "—"}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <span className="inline-flex items-center rounded-md bg-[#111111] px-2.5 py-0.5 text-xs font-medium text-slate-200">
                      {opening.contractType || "Contract"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    <div className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                      {formatDate(opening.postedDate || opening.createdAt)}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-300">{manager}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/vendor/openings/${id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm transition hover:border-lime-300 hover:bg-[#101318]/50 hover:text-lime-300"
                    >
                      View opening
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VendorOpeningsPage() {
  const [viewMode, setViewMode] = useState("table");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [appliedLocation, setAppliedLocation] = useState("");
  const [filtersReady, setFiltersReady] = useState(false);
  const [contractType, setContractType] = useState("");
  const [experience, setExperience] = useState("");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { openings, pagination, openingsLoading, openingsError, fetchOpenings } =
    useVendorOpenings();

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("zelosify-opening-search") || "{}");
      setQuery(saved.query || "");
      setLocation(saved.location || "");
      setContractType(saved.contractType || "");
      setExperience(saved.experience || "");
      setAppliedQuery(saved.query || "");
      setAppliedLocation(saved.location || "");
    } catch {}
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    fetchOpenings({
      page,
      limit: PAGE_SIZE,
      query: appliedQuery,
      location: appliedLocation,
      contractType,
    });
  }, [fetchOpenings, page, filtersReady, appliedQuery, appliedLocation, contractType]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "zelosify-opening-search",
        JSON.stringify({ query, location, contractType, experience })
      );
    } catch {}
  }, [query, location, contractType, experience]);

  const rows = useMemo(() => {
    return [...(openings || [])]
      .filter((opening) => {
        const min = Number(opening.experienceMin ?? opening.minExperience ?? 0);
        const max = opening.experienceMax ?? opening.maxExperience;
        if (experience === "0-2" && (min > 2 || (max != null && Number(max) < 0))) return false;
        if (experience === "3-5" && ((max != null && Number(max) < 3) || min > 5)) return false;
        if (experience === "6+" && max != null && Number(max) < 6) return false;
        return true;
      })
      .sort((a, b) =>
        sort === "newest"
          ? new Date(b.postedDate || b.createdAt || 0) - new Date(a.postedDate || a.createdAt || 0)
          : new Date(a.postedDate || a.createdAt || 0) - new Date(b.postedDate || b.createdAt || 0)
      );
  }, [openings, experience, sort]);

  const activeFilters = Boolean(query || location || contractType || experience);
  const resetFilters = useCallback(() => {
    setQuery("");
    setLocation("");
    setAppliedQuery("");
    setAppliedLocation("");
    setContractType("");
    setExperience("");
    setPage(1);
  }, []);
  const retry = useCallback(
    () =>
      fetchOpenings({
        page,
        limit: PAGE_SIZE,
        query: appliedQuery,
        location: appliedLocation,
        contractType,
        force: true,
      }),
    [fetchOpenings, page, appliedQuery, appliedLocation, contractType]
  );

  return (
    <main className="explore-jobs-page mx-auto w-full max-w-7xl px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.13em] text-lime-300">
            <Sparkles className="h-4 w-4" /> Zelosify opportunities
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-[2.15rem]">
            Contract Openings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Explore active contract opportunities, review requirements, and submit candidates.
          </p>
        </div>
        <p className="text-sm text-slate-500">Find your next great match</p>
      </div>

      <section
        className="mb-6 rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-3 shadow-sm sm:p-4"
        aria-label="Search openings"
      >
        <form
          className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedQuery(query.trim());
            setAppliedLocation(location.trim());
            setPage(1);
          }}
        >
          <label className="search-field">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="sr-only">Job title or description</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Job title or description"
              aria-label="Job title or description"
            />
          </label>
          <label className="search-field">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="sr-only">City, location or remote</span>
            <input
              value={location}
              onChange={(event) => {
                setLocation(event.target.value);
                setPage(1);
              }}
              placeholder="City, location or remote"
              aria-label="City, location or remote"
            />
          </label>
          <Button
            type="submit"
            className="h-11 gap-2 bg-lime-300 px-5 text-black hover:bg-lime-300"
          >
            <Search className="h-4 w-4" />
            Search Jobs
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
          <button
            type="button"
            className={`filter-toggle ${filtersOpen ? "filter-toggle-active" : ""}`}
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters{" "}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
          {activeFilters ? (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-lime-300"
            >
              Clear filters <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-white/[0.08] bg-[#0b0b0b] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "table"
                    ? "bg-[#0b0b0b] text-lime-300 shadow-sm"
                    : "text-slate-300 hover:text-slate-100"
                }`}
                aria-label="Table view"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  viewMode === "grid"
                    ? "bg-[#0b0b0b] text-lime-300 shadow-sm"
                    : "text-slate-300 hover:text-slate-100"
                }`}
                aria-label="Cards view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-slate-500">
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span>Sort</span>
              <select
                className="border-0 bg-transparent py-1 text-xs font-semibold text-slate-200 focus:ring-0"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                aria-label="Sort openings"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
        </div>
        {filtersOpen ? (
          <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="filter-select-label">
              Contract type
              <select
                value={contractType}
                onChange={(event) => {
                  setContractType(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Any contract type</option>
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-select-label">
              Experience range
              <select
                value={experience}
                onChange={(event) => {
                  setExperience(event.target.value);
                  setPage(1);
                }}
              >
                {EXPERIENCE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="self-end pb-2 text-xs leading-5 text-slate-500">
              Experience and sort apply to this loaded page. Title, location, and contract filters
              search the full paginated result set.
            </p>
          </div>
        ) : null}
      </section>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Available opportunities</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {pagination.total || 0}{" "}
            {appliedQuery || appliedLocation || contractType
              ? "matching openings"
              : "openings in your organization"}
          </p>
        </div>
        <span className="rounded-full bg-[#111111] px-3 py-1 text-xs font-medium text-slate-300">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </div>

      {openingsError ? (
        <div className="mb-4">
          <ErrorState title="Unable to load openings" message={openingsError} onRetry={retry} />
        </div>
      ) : null}
      {openingsLoading ? (
        viewMode === "table" ? (
          <OpeningTableSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        )
      ) : null}
      {!openingsLoading && !openingsError && rows.length ? (
        viewMode === "table" ? (
          <OpeningTable rows={rows} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((opening) => (
              <OpeningCard key={getId(opening)} opening={opening} />
            ))}
          </div>
        )
      ) : null}
      {!openingsLoading && !openingsError && rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b]">
          <EmptyState
            title={activeFilters ? "No matching openings" : "No openings available"}
            description={
              activeFilters
                ? "Try adjusting your search or clearing some filters."
                : "There are no contract openings for your organization right now."
            }
          />
          {activeFilters ? (
            <div className="pb-6 text-center">
              <Button variant="outline" onClick={resetFilters}>
                Clear search
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {!openingsLoading && !openingsError && openings?.length ? (
        <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0b0b0b] px-4">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            disabled={openingsLoading}
          />
        </div>
      ) : null}
      <p className="mt-6 text-xs text-slate-400">
        Showing {rows.length} openings from the current results page.
      </p>
    </main>
  );
}
