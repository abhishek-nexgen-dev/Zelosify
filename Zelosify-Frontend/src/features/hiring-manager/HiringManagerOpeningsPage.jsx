"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useHiringManagerOpenings from "@/hooks/Dashboard/HiringManager/useHiringManagerOpenings";
import PageHeader from "@/components/recruitment/PageHeader";
import Pagination from "@/components/recruitment/Pagination";
import { EmptyState, ErrorState } from "@/components/recruitment/StateMessage";
import { formatDate, getId } from "@/components/recruitment/format";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import { Button } from "@/components/UI/shadcn/button";
import useAuth from "@/hooks/Auth/useAuth";
import { hasPermission } from "@/features/auth/permissions";

const PAGE_SIZE = 10;

export default function HiringManagerOpeningsPage() {
  const { user } = useAuth();
  const canViewJobs = user?.role === "HIRING_MANAGER" && hasPermission(user, "JOBS_VIEW");
  const canCreateJobs = user?.role === "HIRING_MANAGER" && hasPermission(user, "JOBS_CREATE");
  const [page, setPage] = useState(1);
  const { openings, pagination, openingsLoading, openingsError, fetchOpenings } =
    useHiringManagerOpenings();

  useEffect(() => {
    if (canViewJobs) fetchOpenings({ page, limit: PAGE_SIZE });
  }, [canViewJobs, fetchOpenings, page]);

  const rows = useMemo(() => openings ?? [], [openings]);
  const onPageChange = useCallback((nextPage) => setPage(nextPage), []);
  const retry = useCallback(
    () => fetchOpenings({ page, limit: PAGE_SIZE, force: true }),
    [fetchOpenings, page]
  );
  if (!canViewJobs)
    return <main className="p-8">You do not have permission to view assigned openings.</main>;

  return (
    <div className="recruitment-shell mx-auto w-full max-w-7xl p-4 sm:p-7 lg:p-10">
      <PageHeader
        title="My Openings"
        description="Review candidates submitted to your openings. You can also create an opening and assign a recruiter."
        action={
          canCreateJobs ? (
            <Link href="/recruiter/jobs/new">
              <Button className="bg-lime-300 text-black hover:bg-lime-200">Create opening</Button>
            </Link>
          ) : null
        }
      />

      {openingsError ? (
        <ErrorState title="Unable to load openings" message={openingsError} onRetry={retry} />
      ) : null}

      {openingsLoading ? (
        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-4 dark:border-slate-800 dark:bg-[#0b0b0b]/40">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : null}

      {!openingsLoading && !openingsError ? (
        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0b0b0b] shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]/40">
          {rows.length === 0 ? (
            <EmptyState
              title="No openings assigned to you"
              description="When openings are assigned to you, they will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#0b0b0b] text-xs uppercase tracking-wide text-slate-300 dark:bg-[#171717]/60 dark:text-slate-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Contract Type</th>
                    <th className="px-4 py-3 font-semibold">Posted Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.08] dark:divide-slate-800">
                  {rows.map((opening) => {
                    const id = getId(opening);
                    return (
                      <tr key={id} className="hover:bg-[#0b0b0b] dark:hover:bg-[#171717]/30">
                        <td className="px-4 py-3 font-medium text-slate-100 dark:text-slate-100">
                          <Link
                            href={`/hiring-manager/openings/${id}`}
                            className="text-lime-300 hover:underline dark:text-lime-400"
                          >
                            {opening.title || "Untitled opening"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-200 dark:text-slate-300">
                          {opening.location || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-200 dark:text-slate-300">
                          {opening.contractType || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-200 dark:text-slate-300">
                          {formatDate(opening.postedDate || opening.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-slate-200 dark:text-slate-300">
                          {opening.status || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/hiring-manager/openings/${id}`}>
                            <Button size="sm" variant="outline">
                              Review candidates
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-white/[0.08] p-4 dark:border-slate-800">
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={onPageChange}
              disabled={openingsLoading}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
