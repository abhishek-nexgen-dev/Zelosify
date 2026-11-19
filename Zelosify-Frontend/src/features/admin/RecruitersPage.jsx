"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  CalendarDays,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";
import Pagination from "@/components/recruitment/Pagination";
import { formatDate } from "@/components/recruitment/format";
import { deleteTeamMember, listRecruiters } from "@/features/admin/api";
import {
  canCreateTeamMember,
  canManagePermissionTargets,
  hasPermission,
} from "@/features/auth/permissions";

const PAGE_SIZE = 10;
const roleStyle = {
  RECRUITER:
    "border-lime-300/15 bg-[#141414] text-lime-300 dark:border-lime-900 dark:bg-lime-950/60 dark:text-lime-300",
  HIRING_MANAGER:
    "border-sky-300/15 bg-[#101318] text-sky-300 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-300",
  IT_VENDOR:
    "border-violet-200 bg-[#151217] text-violet-300 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300",
};

export default function RecruitersPage() {
  const { user } = useAuth();
  const hasTeamPageRole = user?.role === "ADMIN";
  const canManageRecruiters = hasTeamPageRole && hasPermission(user, "TEAM_VIEW");
  const canCreateMember = canCreateTeamMember(user);
  const createActionLabel =
    user?.role === "HIRING_MANAGER" ? "Create recruiter" : "Create team member";
  const canOpenPermissionPage = canManagePermissionTargets(user);
  const canDeleteTeamMember = user?.role === "ADMIN";
  const canFilterByRole = user?.role === "ADMIN";
  const [people, setPeople] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [state, setState] = useState({ loading: true, error: "" });
  const [accountActionError, setAccountActionError] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (requestedPage = page) => {
      const currentRequest = ++requestId.current;
      setState({ loading: true, error: "" });
      try {
        const response = await listRecruiters({
          page: requestedPage,
          limit: PAGE_SIZE,
          ...(search ? { search } : {}),
          ...(canFilterByRole && roleFilter ? { role: roleFilter } : {}),
        });
        if (requestId.current !== currentRequest) return;
        setPeople(Array.isArray(response?.data) ? response.data : []);
        const nextPagination = response?.pagination || {
          page: requestedPage,
          limit: PAGE_SIZE,
          total: response?.count ?? response?.data?.length ?? 0,
          totalPages: 1,
        };
        setPagination(nextPagination);
        setPage(nextPagination.page || requestedPage);
        setState({ loading: false, error: "" });
      } catch {
        if (requestId.current === currentRequest) {
          setState({ loading: false, error: "Team accounts could not be loaded." });
        }
      }
    },
    [canFilterByRole, page, roleFilter, search]
  );

  const deleteMember = async (person) => {
    if (pendingDeleteId !== person.id) {
      setPendingDeleteId(person.id);
      setAccountActionError("");
      return;
    }

    setDeletingId(person.id);
    setAccountActionError("");
    try {
      const result = await deleteTeamMember(person.id);
      setPeople((current) => current.filter((member) => member.id !== person.id));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      setPendingDeleteId(null);
      if (people.length === 1 && page > 1) setPage((current) => current - 1);
      else void load(page);
      if (result?.identityCleanupPending) {
        setAccountActionError(
          "The app account was deleted, but Keycloak cleanup needs administrator attention."
        );
      }
    } catch (error) {
      setAccountActionError(error?.response?.data?.message || "The account could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (canManageRecruiters) void load(page);
    return () => {
      requestId.current += 1;
    };
  }, [canManageRecruiters, load, page, user?.id]);

  if (!user) return <main className="p-8">Sign in to continue.</main>;
  if (!hasTeamPageRole || !canManageRecruiters)
    return <main className="p-8">Recruiting team access is not available for this account.</main>;

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-7 text-slate-50 dark:bg-[#050505] dark:text-white sm:px-7 sm:py-9 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 text-white sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-lime-50">
                <UsersRound className="h-3.5 w-3.5" aria-hidden="true" /> TEAM WORKSPACE
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                Recruiting team
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-lime-100 sm:text-base">
                {user.role === "HIRING_MANAGER"
                  ? "See the recruiters supporting your openings."
                  : "View your team, check assigned jobs, and manage account access."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canOpenPermissionPage && (
                <Link
                  href="/admin/permissions"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Manage permissions
                </Link>
              )}
              {canCreateMember && (
                <Link
                  href="/admin/recruiters/new"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0b0b0b] px-4 py-2.5 text-sm font-bold text-lime-200 shadow-lg transition hover:-translate-y-0.5 hover:bg-[#101318] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> {createActionLabel}
                </Link>
              )}
            </div>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4 dark:border-slate-800 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141414] text-lime-300 dark:bg-lime-500/10 dark:text-lime-300">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">
                  {user.role === "HIRING_MANAGER" ? "Recruiters" : "Recruiting team"}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {pagination.total} team member{pagination.total === 1 ? "" : "s"} in your
                  organization
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Newest first</p>
          </div>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput.trim());
            }}
            className="grid gap-3 border-b border-white/[0.06] p-4 dark:border-slate-800 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-5"
          >
            <label className="relative block min-w-0">
              <span className="sr-only">Search team by name, email, username, or department</span>
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by name, email, username, or department"
                maxLength={100}
                className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-[#0b0b0b] pl-10 pr-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-lime-400 focus:bg-[#0b0b0b] focus:ring-4 focus:ring-lime-500/10 dark:border-slate-700 dark:bg-[#050505] dark:text-white dark:focus:bg-[#050505]"
              />
            </label>
            {canFilterByRole && (
              <label className="min-w-0">
                <span className="sr-only">Filter team members by role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value);
                    setPage(1);
                  }}
                  className="min-h-11 w-full min-w-44 rounded-xl border border-white/[0.08] bg-[#0b0b0b] px-3 text-sm text-slate-200 outline-none transition focus:border-lime-400 focus:ring-4 focus:ring-lime-500/10 dark:border-slate-700 dark:bg-[#050505] dark:text-slate-200"
                >
                  <option value="">All team roles</option>
                  <option value="RECRUITER">Recruiters</option>
                  <option value="HIRING_MANAGER">Hiring managers</option>
                  <option value="IT_VENDOR">IT vendors</option>
                </select>
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={state.loading}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:opacity-60 sm:flex-none"
              >
                <Search className="h-4 w-4" aria-hidden="true" /> Search
              </button>
              {(search || searchInput || roleFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setRoleFilter("");
                    setPage(1);
                  }}
                  aria-label="Clear search and filters"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/[0.08] text-slate-300 transition hover:bg-[#0b0b0b] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#171717]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>

          {state.error && (
            <div
              role="alert"
              className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <span>{state.error}</span>
              <button
                type="button"
                onClick={() => void load(pagination.page)}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}
          {accountActionError && (
            <p
              role="alert"
              className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            >
              {accountActionError}
            </p>
          )}

          {state.loading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading recruiting team">
              {[0, 1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="h-16 animate-pulse rounded-xl bg-[#111111] dark:bg-[#171717]"
                />
              ))}
            </div>
          ) : !state.error && people.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#141414] text-lime-300 dark:bg-lime-500/10 dark:text-lime-300">
                <UsersRound className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">
                {search || roleFilter ? "No team members found" : "Your team is empty"}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {search || roleFilter
                  ? "Try a different search or clear the filters."
                  : user.role === "HIRING_MANAGER"
                    ? "Recruiters assigned to your openings will appear here."
                    : "Create a team member to get started."}
              </p>
              {canCreateMember && (
                <Link
                  href="/admin/recruiters/new"
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-lime-300 px-4 text-sm font-semibold text-black hover:bg-lime-200"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" /> {createActionLabel}
                </Link>
              )}
            </div>
          ) : !state.error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-[#0b0b0b] text-xs uppercase tracking-wider text-slate-500 dark:bg-[#050505]/60 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-semibold sm:px-6">
                      Team member
                    </th>
                    <th scope="col" className="px-4 py-3.5 font-semibold">
                      Role
                    </th>
                    <th scope="col" className="px-4 py-3.5 font-semibold">
                      Department
                    </th>
                    <th scope="col" className="px-4 py-3.5 font-semibold">
                      Assigned jobs
                    </th>
                    <th scope="col" className="px-5 py-3.5 font-semibold sm:px-6">
                      Joined
                    </th>
                    {canOpenPermissionPage && (
                      <th scope="col" className="px-5 py-3.5 font-semibold">
                        Access
                      </th>
                    )}
                    <th scope="col" className="px-5 py-3.5 font-semibold">
                      Account
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] dark:divide-slate-800">
                  {people.map((person) => {
                    const name =
                      [person.firstName, person.lastName].filter(Boolean).join(" ") ||
                      person.username ||
                      "Team member";
                    return (
                      <tr
                        key={person.id}
                        className="transition hover:bg-[#141414]/40 dark:hover:bg-lime-950/20"
                      >
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center gap-3">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${person.role === "HIRING_MANAGER" ? "bg-[#101318] text-sky-300 dark:bg-sky-500/10 dark:text-sky-300" : "bg-[#141414] text-lime-300 dark:bg-lime-500/10 dark:text-lime-300"}`}
                            >
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-100 dark:text-white">
                                {name}
                              </p>
                              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                                {person.email}
                                {person.username ? ` · @${person.username}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${roleStyle[person.role] || roleStyle.RECRUITER}`}
                          >
                            {person.role === "HIRING_MANAGER"
                              ? "Hiring manager"
                              : person.role === "IT_VENDOR"
                                ? "IT vendor"
                                : "Recruiter"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-300 dark:text-slate-300">
                          {person.department || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0b0b0b] px-2.5 py-1.5 text-sm font-semibold text-slate-200 dark:border-slate-700 dark:bg-[#050505] dark:text-slate-200">
                            <BriefcaseBusiness
                              className="h-3.5 w-3.5 text-lime-500 dark:text-lime-300"
                              aria-hidden="true"
                            />
                            {person.assignedJobsCount ?? 0}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-300 dark:text-slate-300 sm:px-6">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays
                              className="h-3.5 w-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                            {formatDate(person.createdAt)}
                          </span>
                        </td>
                        {canOpenPermissionPage && (
                          <td className="px-5 py-4">
                            <Link
                              href="/admin/permissions"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-lime-300 hover:text-lime-100 dark:text-lime-300 dark:hover:text-lime-200"
                            >
                              <ShieldCheck className="h-4 w-4" aria-hidden="true" />{" "}
                              {person.permissions?.length ?? 0} permissions
                            </Link>
                          </td>
                        )}
                        <td className="px-5 py-4">
                          {(user.role !== "HIRING_MANAGER" || person.role === "RECRUITER") &&
                          person.id !== user.id &&
                          canDeleteTeamMember && person.role !== "IT_VENDOR" ? (
                            pendingDeleteId === person.id ? (
                              <span className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => void deleteMember(person)}
                                  disabled={deletingId === person.id}
                                  className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
                                >
                                  {deletingId === person.id ? "Deleting…" : "Confirm"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(null)}
                                  disabled={deletingId === person.id}
                                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-[#0b0b0b] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#171717]"
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void deleteMember(person)}
                                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                                aria-label={`Delete ${person.role === "HIRING_MANAGER" ? "hiring manager" : "recruiter"} ${name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {!state.loading && !state.error && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages || 1}
            onPageChange={setPage}
            disabled={state.loading}
          />
        )}
      </div>
    </main>
  );
}
