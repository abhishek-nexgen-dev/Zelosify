"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";
import Pagination from "@/components/recruitment/Pagination";
import {
  grantTeamMemberPermission,
  listPermissionTargets,
  revokeTeamMemberPermission,
  updateTeamMemberPermissions,
} from "@/features/admin/api";
import { APP_PERMISSIONS, canManagePermissionTargets } from "@/features/auth/permissions";

const PAGE_SIZE = 10;
const roleNames = {
  IT_VENDOR: "IT vendor",
  HIRING_MANAGER: "Hiring manager",
  RECRUITER: "Recruiter",
};
const roleStyles = {
  IT_VENDOR:
    "border-violet-200 bg-[#151217] text-violet-300 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  HIRING_MANAGER:
    "border-sky-300/15 bg-[#101318] text-sky-300 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300",
  RECRUITER:
    "border-lime-300/15 bg-[#141414] text-lime-300 dark:border-lime-900 dark:bg-lime-950/50 dark:text-lime-300",
};

const permissionGroups = [
  { title: "Job openings", keys: ["JOBS_VIEW", "JOBS_CREATE", "JOBS_UPDATE"] },
  { title: "Candidates", keys: ["CANDIDATES_VIEW", "CANDIDATES_SHORTLIST", "CANDIDATES_REJECT"] },
  { title: "Team access", keys: ["TEAM_VIEW", "RECRUITER_CREATE", "RECRUITER_MANAGE"] },
];

export default function PermissionsPage() {
  const { user } = useAuth();
  const canManageTargets = canManagePermissionTargets(user);
  const isAdmin = user?.role === "ADMIN";
  const [targets, setTargets] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [draftPermissions, setDraftPermissions] = useState([]);
  const [state, setState] = useState({ loading: true, error: "", success: "" });
  const [savingId, setSavingId] = useState(null);
  const requestId = useRef(0);

  const permissionByKey = useMemo(
    () => new Map(APP_PERMISSIONS.map((permission) => [permission.key, permission])),
    []
  );

  const loadTargets = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await listPermissionTargets({
        page,
        limit: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(roleFilter !== "ALL" ? { role: roleFilter } : {}),
      });
      if (requestId.current !== activeRequest) return;
      setTargets(Array.isArray(response?.data) ? response.data : []);
      setPagination(
        response?.pagination || {
          page,
          limit: PAGE_SIZE,
          total: response?.data?.length ?? 0,
          totalPages: 1,
        }
      );
      setState((current) => ({ ...current, loading: false, error: "" }));
    } catch (error) {
      if (requestId.current !== activeRequest) return;
      setState((current) => ({
        ...current,
        loading: false,
        error: error?.response?.data?.message || "Permission accounts could not be loaded.",
      }));
    }
  }, [page, roleFilter, search]);

  useEffect(() => {
    if (canManageTargets) void loadTargets();
    return () => {
      requestId.current += 1;
    };
  }, [canManageTargets, loadTargets]);

  const toggleEditor = (target) => {
    if (expandedId === target.id) {
      setExpandedId(null);
      setDraftPermissions([]);
      return;
    }
    setExpandedId(target.id);
    setDraftPermissions(Array.isArray(target.permissions) ? target.permissions : []);
    setState((current) => ({ ...current, success: "" }));
  };

  const togglePermission = (permission) => {
    setDraftPermissions((current) =>
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    );
  };

  const savePermissions = async (target) => {
    const before = new Set(target.permissions || []);
    const after = new Set(draftPermissions);
    setSavingId(target.id);
    setState({ loading: false, error: "", success: "" });
    try {
      let result;
      if (isAdmin) {
        result = await updateTeamMemberPermissions(target.id, draftPermissions);
      } else {
        result = { id: target.id, permissions: [...before] };
        for (const permission of APP_PERMISSIONS.map((item) => item.key)) {
          if (!before.has(permission) && after.has(permission)) {
            result = await grantTeamMemberPermission(target.id, permission);
          } else if (before.has(permission) && !after.has(permission)) {
            result = await revokeTeamMemberPermission(target.id, permission);
          }
        }
      }
      const updatedPermissions =
        result?.permissions || result?.data?.permissions || draftPermissions;
      setTargets((current) =>
        current.map((item) =>
          item.id === target.id ? { ...item, permissions: updatedPermissions } : item
        )
      );
      setDraftPermissions(updatedPermissions);
      setState({
        loading: false,
        error: "",
        success: `Permissions updated for ${target.firstName || target.username || "team member"}.`,
      });
    } catch (error) {
      setState({
        loading: false,
        error:
          error?.response?.data?.message ||
          "Some permission changes could not be saved. Reload the list to confirm the current access.",
        success: "",
      });
      void loadTargets();
    } finally {
      setSavingId(null);
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  if (!user) return <main className="p-8">Sign in to continue.</main>;
  if (!canManageTargets)
    return <main className="p-8">Permission management is not available for this account.</main>;

  const firstResult = pagination.total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = Math.min(page * PAGE_SIZE, pagination.total);

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-7 text-slate-50 dark:bg-[#050505] dark:text-white sm:px-7 sm:py-9 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/admin/recruiters"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-lime-300 dark:text-slate-300 dark:hover:text-lime-300"
        >
          <ArrowRight className="h-4 w-4 rotate-180" aria-hidden="true" /> Recruiting team
        </Link>

        <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 text-white sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-lime-50">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> ACCESS CONTROL
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                Team permissions
              </h1>
              <p className="mt-2 text-sm leading-6 text-lime-100 sm:text-base">
                Assign the access each recruiter, hiring manager, and IT vendor needs. Candidate
                accounts are managed through their default access.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-lime-50">
              <span className="block text-xs font-medium uppercase tracking-wide text-lime-200">
                Signed in as
              </span>
              <span className="mt-1 block font-semibold">
                {user.firstName || user.username} · {roleNames[user.role] || user.role}
              </span>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141414] text-lime-300 dark:bg-lime-500/10 dark:text-lime-300">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold">Internal accounts</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Showing {firstResult}–{lastResult} of {pagination.total} accounts in this tenant
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <form onSubmit={submitSearch} className="flex gap-2">
                <label htmlFor="permission-target-search" className="sr-only">
                  Search team accounts
                </label>
                <div className="relative min-w-0 flex-1 sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    id="permission-target-search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Name, email, or username"
                    className="min-h-10 w-full rounded-xl border border-slate-700 bg-[#0b0b0b] pl-9 pr-3 text-sm outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-100 dark:border-slate-700 dark:bg-[#050505] dark:focus:ring-lime-950"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-10 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-black hover:bg-lime-200"
                >
                  Search
                </button>
              </form>
              <label className="relative flex min-h-10 items-center gap-2 rounded-xl border border-slate-700 bg-[#0b0b0b] px-3 text-sm dark:border-slate-700 dark:bg-[#050505]">
                <SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden="true" />
                <span className="sr-only">Filter by role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => {
                    setRoleFilter(event.target.value);
                    setPage(1);
                  }}
                  className="min-w-32 bg-transparent pr-5 outline-none"
                >
                  <option value="ALL">All roles</option>
                  <option value="IT_VENDOR">IT vendors</option>
                  <option value="HIRING_MANAGER">Hiring managers</option>
                  <option value="RECRUITER">Recruiters</option>
                </select>
              </label>
            </div>
          </div>

          {state.error && (
            <div
              role="alert"
              className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
            >
              <span>{state.error}</span>
              <button
                type="button"
                onClick={() => void loadTargets()}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}
          {state.success && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
            >
              {state.success}
            </p>
          )}

          <div className="mt-5 space-y-3">
            {state.loading ? (
              <div className="space-y-3" role="status" aria-label="Loading permission targets">
                {[0, 1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="h-20 animate-pulse rounded-xl bg-[#111111] dark:bg-[#171717]"
                  />
                ))}
              </div>
            ) : targets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-14 text-center dark:border-slate-700">
                <UsersRound className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 font-semibold">No matching internal accounts</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Try another search or role filter.
                </p>
              </div>
            ) : (
              targets.map((target) => {
                const displayName =
                  [target.firstName, target.lastName].filter(Boolean).join(" ") ||
                  target.username ||
                  "Team member";
                const expanded = expandedId === target.id;
                const targetPermissions = target.permissions || [];
                return (
                  <article
                    key={target.id}
                    className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] dark:border-slate-800 dark:bg-[#050505]/40"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#141414] text-sm font-bold text-lime-300 dark:bg-lime-500/10 dark:text-lime-300">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{displayName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                            {target.email}
                            {target.username ? ` · @${target.username}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${roleStyles[target.role] || roleStyles.RECRUITER}`}
                        >
                          {roleNames[target.role] || target.role}
                        </span>
                        <span className="rounded-full bg-[#111111] px-2.5 py-1 text-xs font-semibold text-slate-300 dark:bg-[#171717] dark:text-slate-300">
                          {targetPermissions.length} permissions
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleEditor(target)}
                          aria-expanded={expanded}
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-lime-300/15 px-3 text-sm font-semibold text-lime-300 hover:bg-[#141414] dark:border-lime-900 dark:text-lime-300 dark:hover:bg-lime-950/40"
                        >
                          {expanded ? "Close editor" : "Manage access"}
                          <ChevronDown
                            className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="border-t border-white/[0.08] bg-[#0b0b0b] p-4 dark:border-slate-800 dark:bg-[#0b0b0b]/50 sm:p-5">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold">Access for {displayName}</h3>
                            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {isAdmin
                                ? "Choose the complete permission set for this account."
                                : "Add or remove permissions. Each change is saved through the permission API."}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            Changes apply to this account only
                          </span>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          {permissionGroups.map((group) => (
                            <fieldset
                              key={group.title}
                              className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-4 dark:border-slate-800 dark:bg-[#050505]"
                            >
                              <legend className="px-1 text-sm font-semibold">{group.title}</legend>
                              <div className="mt-2 space-y-2.5">
                                {group.keys.map((key) => {
                                  const permission = permissionByKey.get(key);
                                  if (!permission) return null;
                                  return (
                                    <label
                                      key={key}
                                      className="flex cursor-pointer items-start gap-2.5 text-sm leading-5"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={draftPermissions.includes(key)}
                                        onChange={() => togglePermission(key)}
                                        disabled={savingId === target.id}
                                        className="mt-1 h-4 w-4 rounded border-slate-700 accent-lime-600 disabled:cursor-not-allowed"
                                      />
                                      <span>
                                        <span className="block font-medium text-slate-100 dark:text-slate-200">
                                          {permission.label}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-slate-400">
                                          {key}
                                        </span>
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            </fieldset>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDraftPermissions(targetPermissions);
                              setExpandedId(null);
                            }}
                            disabled={savingId === target.id}
                            className="min-h-10 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-[#0b0b0b] disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-[#171717]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void savePermissions(target)}
                            disabled={
                              savingId === target.id ||
                              (draftPermissions.length === targetPermissions.length &&
                                draftPermissions.every((item) => targetPermissions.includes(item)))
                            }
                            className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-black hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            {savingId === target.id
                              ? "Saving…"
                              : isAdmin
                                ? "Save permission set"
                                : "Apply permission changes"}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        {!state.loading && pagination.totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
            disabled={state.loading || Boolean(savingId)}
          />
        )}
      </div>
    </main>
  );
}
