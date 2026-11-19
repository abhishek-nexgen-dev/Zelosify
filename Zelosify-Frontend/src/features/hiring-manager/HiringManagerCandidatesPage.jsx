"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import useHiringManagerOpenings from "@/hooks/Dashboard/HiringManager/useHiringManagerOpenings";
import PageHeader from "@/components/recruitment/PageHeader";
import StatusBadge from "@/components/recruitment/StatusBadge";
import { ErrorState, EmptyState } from "@/components/recruitment/StateMessage";
import { formatDate, formatPercent, getId } from "@/components/recruitment/format";
import { Button } from "@/components/UI/shadcn/button";
import { Skeleton } from "@/components/UI/shadcn/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/UI/shadcn/alert-dialog";
import { fetchManagerOpeningById } from "@/features/hiring-manager/api";
import useAuth from "@/hooks/Auth/useAuth";
import { hasPermission } from "@/features/auth/permissions";
import MarkdownContent from "@/components/content/MarkdownContent";

function recommendationLabel(p) {
  if (p.recommendationFailed || p.recommendationStatus === "FAILED" || p.aiStatus === "FAILED")
    return "Failed";
  const score = p.recommendationScore ?? p.score;
  const hasResult =
    p.recommendedAt || p.recommendationReason || p.reason || score != null || p.recommended != null;
  const processing =
    p.recommendationStatus === "PENDING" ||
    p.recommendationStatus === "PROCESSING" ||
    p.aiStatus === "PENDING" ||
    p.aiStatus === "PROCESSING";
  if (!hasResult && (processing || score == null)) return "Processing";
  if (!hasResult) return "Pending";
  const n = Number(score);
  if (!Number.isFinite(n)) return "Processing";
  const s = n <= 1 ? n : n / 100;
  if (s >= 0.75) return "Recommended";
  if (s >= 0.5) return "Borderline";
  return "Not Recommended";
}

const VIRTUAL_ROW_GAP = 12;
const ESTIMATED_ROW_HEIGHT = 440;

function useVirtualRows(rows, containerRef) {
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);
  const [measuredHeights, setMeasuredHeights] = useState({});
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setHeight(e.contentRect.height || 600);
    });
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    setHeight(el.clientHeight || 600);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, [containerRef]);

  const layout = useMemo(() => {
    const offsets = [];
    const rowHeights = [];
    let totalHeight = 0;
    for (const row of rows) {
      offsets.push(totalHeight);
      const rowHeight = measuredHeights[String(getId(row))] || ESTIMATED_ROW_HEIGHT;
      rowHeights.push(rowHeight);
      totalHeight += rowHeight;
    }
    return { offsets, rowHeights, totalHeight };
  }, [measuredHeights, rows]);

  const start = useMemo(() => {
    const threshold = Math.max(0, scrollTop - ESTIMATED_ROW_HEIGHT);
    let index = 0;
    while (index < rows.length - 1 && layout.offsets[index] + layout.rowHeights[index] < threshold)
      index += 1;
    return index;
  }, [layout, rows.length, scrollTop]);
  const end = useMemo(() => {
    const threshold = scrollTop + height + ESTIMATED_ROW_HEIGHT;
    let index = start;
    while (index < rows.length && layout.offsets[index] < threshold) index += 1;
    return index;
  }, [height, layout, rows.length, scrollTop, start]);
  const measureRow = useCallback((id, measuredHeight) => {
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return;
    const key = String(id);
    setMeasuredHeights((current) => {
      if (Math.abs((current[key] || ESTIMATED_ROW_HEIGHT) - measuredHeight) < 2) return current;
      return { ...current, [key]: measuredHeight };
    });
  }, []);

  return { start, end, offsets: layout.offsets, totalHeight: layout.totalHeight, measureRow };
}

function VirtualizedCandidateRow({ id, top, measureRow, children }) {
  const rowRef = useRef(null);
  useEffect(() => {
    const node = rowRef.current;
    if (!node) return;
    const measure = () => measureRow(id, node.getBoundingClientRect().height);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [id, measureRow]);

  return (
    <div
      ref={rowRef}
      style={{ position: "absolute", top, left: 0, right: 0, paddingBottom: VIRTUAL_ROW_GAP }}
    >
      {children}
    </div>
  );
}

function CandidateCard({ profile, onShortlist, onReject, busy, canShortlist, canReject }) {
  const id = getId(profile);
  const fileName =
    profile.fileName || profile.originalName || profile.name || profile.s3Key || `Profile #${id}`;
  const label = recommendationLabel(profile);
  const score = profile.recommendationScore ?? profile.score;
  const confidence = profile.recommendationConfidence ?? profile.confidence;
  const reason = profile.recommendationReason ?? profile.reason;
  const latency = profile.recommendationLatencyMs ?? profile.processingTimeMs ?? profile.latencyMs;
  const status = profile.status || "SUBMITTED";
  const isProcessing = label === "Processing" || label === "Pending";
  const isFailed = label === "Failed";

  return (
    <article className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]/40 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3
            className="truncate text-base font-semibold text-slate-100 dark:text-slate-100"
            title={fileName}
          >
            {fileName}
          </h3>
          {profile.candidate && (
            <p className="mt-1 text-sm font-medium text-slate-200 dark:text-slate-200">
              {profile.candidate.name || "Candidate"}
            </p>
          )}
          {profile.candidate?.email && (
            <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">
              {profile.candidate.email}
            </p>
          )}
          {profile.candidate?.mobileNumber && (
            <a
              href={`tel:${profile.candidate.mobileNumber}`}
              className="mt-1 block text-sm text-slate-300 hover:underline dark:text-slate-400"
            >
              {profile.candidate.mobileNumber}
            </a>
          )}
          <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">
            Uploaded:{" "}
            {formatDate(profile.submittedAt || profile.createdAt || profile.uploadDate, {
              withTime: true,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={label} />
          <StatusBadge label={status} />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-[#0b0b0b] p-3 dark:bg-[#171717]/50">
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Score
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100 dark:text-slate-100">
            {isProcessing || isFailed ? "—" : formatPercent(score)}
          </dd>
        </div>
        <div className="rounded-lg bg-[#0b0b0b] p-3 dark:bg-[#171717]/50">
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            ATS match
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100 dark:text-slate-100">
            {isProcessing || isFailed || profile.atsScore == null ? "—" : `${profile.atsScore}/100`}
          </dd>
        </div>
        <div className="rounded-lg bg-[#0b0b0b] p-3 dark:bg-[#171717]/50">
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Confidence
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100 dark:text-slate-100">
            {isProcessing || isFailed ? "—" : formatPercent(confidence)}
          </dd>
        </div>
        <div className="rounded-lg bg-[#0b0b0b] p-3 dark:bg-[#171717]/50">
          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Processing time
          </dt>
          <dd className="mt-1 text-lg font-semibold text-slate-100 dark:text-slate-100">
            {latency != null && Number.isFinite(Number(latency))
              ? `${Math.round(Number(latency))} ms`
              : "—"}
          </dd>
        </div>
      </dl>

      {profile.resumeAnalysis && (
        <div className="mt-4 rounded-lg border border-white/[0.06] p-4 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Resume profile extracted by AI
          </p>
          <p className="mt-2 text-sm text-slate-200 dark:text-slate-200">
            {profile.resumeAnalysis.experienceYears} years experience ·{" "}
            {profile.resumeAnalysis.location || "Location not found"}
          </p>
          <p className="mt-1 text-sm text-slate-300 dark:text-slate-300">
            Education: {(profile.resumeAnalysis.education || []).join(", ") || "Not found"}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(profile.resumeAnalysis.skills || []).slice(0, 12).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-[#141414] px-2 py-1 text-xs text-lime-200 dark:bg-lime-950/50 dark:text-lime-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-slate-100 dark:text-slate-100">Explanation</h4>
        {isProcessing ? (
          <p className="mt-1 text-sm text-lime-300 dark:text-lime-300">
            Analyzing resume… Recommendation will appear here when ready.
          </p>
        ) : isFailed ? (
          <div className="mt-1 text-sm text-red-700 dark:text-red-300">
            <p>Recommendation could not be completed.</p>
            {reason ? (
              <MarkdownContent className="mt-2">{String(reason)}</MarkdownContent>
            ) : (
              <p className="mt-2">
                Please try again later or contact support if the issue persists.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-1">
            <MarkdownContent>{reason || "No explanation provided."}</MarkdownContent>
          </div>
        )}
      </div>

      <div className="mt-4">
        <Link
          href={`/applications/${id}/score`}
          className="inline-flex min-h-10 items-center rounded-lg border border-lime-300/15 px-3 text-sm font-semibold text-lime-300 transition hover:bg-[#141414] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:border-lime-900 dark:text-lime-300 dark:hover:bg-lime-950/40"
        >
          View full AI score
        </Link>
      </div>

      {(canShortlist || canReject) && (
        <div className="mt-4 flex flex-col gap-2 border-t border-white/[0.08] pt-4 dark:border-slate-800 sm:flex-row sm:justify-end">
          {canShortlist && (
            <Button
              onClick={() => onShortlist(id)}
              disabled={busy || status === "SHORTLISTED"}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {status === "SHORTLISTED" ? "Shortlisted" : "Shortlist"}
            </Button>
          )}
          {canReject && (
            <Button
              variant="outline"
              onClick={() => onReject(id)}
              disabled={busy || status === "REJECTED"}
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300"
            >
              {status === "REJECTED" ? "Rejected" : "Reject"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export default function HiringManagerCandidatesPage({ openingId }) {
  const { user } = useAuth();
  const canViewCandidates =
    user?.role === "HIRING_MANAGER" && hasPermission(user, "CANDIDATES_VIEW");
  const canShortlist =
    user?.role === "HIRING_MANAGER" && hasPermission(user, "CANDIDATES_SHORTLIST");
  const canReject = user?.role === "HIRING_MANAGER" && hasPermission(user, "CANDIDATES_REJECT");
  const {
    profiles,
    profilesPagination,
    profilesLoading,
    profilesError,
    decisionLoadingId,
    decisionError,
    fetchProfiles,
    shortlist,
    reject,
    clearDecisionErr,
  } = useHiringManagerOpenings();

  const [confirm, setConfirm] = useState(null);
  const [acting, setActing] = useState(false);
  const [opening, setOpening] = useState(null);
  const [openingLoading, setOpeningLoading] = useState(Boolean(openingId));
  const [openingError, setOpeningError] = useState("");
  const [profilePage, setProfilePage] = useState(1);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    setOpening(null);
    setOpeningError("");
    setOpeningLoading(Boolean(openingId));
    if (openingId) {
      fetchManagerOpeningById(openingId)
        .then((data) => {
          if (active) setOpening(data);
        })
        .catch((error) => {
          if (active) setOpeningError(error?.message || "Unable to load opening details.");
        })
        .finally(() => {
          if (active) setOpeningLoading(false);
        });
    }
    return () => {
      active = false;
    };
  }, [openingId]);

  useEffect(() => {
    if (openingId && canViewCandidates) fetchProfiles(openingId, { page: profilePage, limit: 100 });
  }, [canViewCandidates, openingId, profilePage, fetchProfiles]);

  useEffect(() => {
    if (!openingId || !canViewCandidates) return;
    const hasPending = (profiles || []).some((p) => {
      const l = recommendationLabel(p);
      return l === "Processing" || l === "Pending";
    });
    if (!hasPending) return;
    const t = setInterval(() => fetchProfiles(openingId, { page: profilePage, limit: 100 }), 5000);
    return () => clearInterval(t);
  }, [canViewCandidates, openingId, profilePage, profiles, fetchProfiles]);

  const rows = useMemo(() => profiles || [], [profiles]);
  const virtual = useVirtualRows(rows, scrollRef);

  const ask = useCallback((id, action) => setConfirm({ id, action }), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);

  const doAction = async () => {
    if (!confirm) return;
    setActing(true);
    clearDecisionErr();
    try {
      if (confirm.action === "shortlist") await shortlist(confirm.id);
      else await reject(confirm.id);
      toast.success(
        confirm.action === "shortlist" ? "Candidate shortlisted" : "Candidate rejected"
      );
      setConfirm(null);
    } catch (e) {
      toast.error(typeof e === "string" ? e : e?.message || "Action failed");
    } finally {
      setActing(false);
    }
  };

  const visibleRows = rows.length > 50 ? rows.slice(virtual.start, virtual.end) : rows;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [profilePage]);

  if (!canViewCandidates)
    return <main className="p-8">You do not have permission to view candidates and resumes.</main>;
  return (
    <div className="recruitment-shell mx-auto w-full max-w-7xl p-4 sm:p-7 lg:p-10">
      <PageHeader
        title="Candidate review"
        description="Review AI recommendations and shortlist or reject candidates for this opening."
        back={
          <Link
            href="/hiring-manager/openings"
            className="text-sm text-lime-300 hover:underline dark:text-lime-400"
          >
            ← Back to my openings
          </Link>
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfiles(openingId, { page: profilePage, limit: 100 })}
            disabled={profilesLoading}
          >
            Refresh
          </Button>
        }
      />

      {openingLoading ? (
        <div
          className="mb-6 rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-5 dark:border-slate-800 dark:bg-[#0b0b0b]/40"
          aria-label="Loading opening details"
        >
          <Skeleton className="h-6 w-56" />
          <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
        </div>
      ) : null}
      {openingError ? (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          role="alert"
        >
          <p>{openingError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              setOpeningError("");
              setOpeningLoading(true);
              fetchManagerOpeningById(openingId)
                .then(setOpening)
                .catch((error) =>
                  setOpeningError(error?.message || "Unable to load opening details.")
                )
                .finally(() => setOpeningLoading(false));
            }}
          >
            Retry opening details
          </Button>
        </div>
      ) : null}

      {opening ? (
        <section className="mb-6 rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]/40 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-lime-300 dark:text-lime-400">
                Opening Summary
              </span>
              <h2 className="mt-1 text-xl font-bold text-slate-100 dark:text-slate-100">
                {opening.title || "Untitled opening"}
              </h2>
              {opening.companyName || opening.company?.name ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {opening.companyName || opening.company?.name}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[#111111] px-2.5 py-1 text-xs font-semibold text-slate-200 dark:bg-[#171717] dark:text-slate-300">
                {opening.contractType || "Contract"}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {opening.status || "ACTIVE"}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-4 text-xs dark:border-slate-800 sm:grid-cols-4">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Location:</span>
              <p className="mt-0.5 font-medium text-slate-100 dark:text-slate-100">
                {opening.location || "Remote"}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Posted Date:</span>
              <p className="mt-0.5 font-medium text-slate-100 dark:text-slate-100">
                {formatDate(opening.postedDate || opening.createdAt)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Candidates Submitted:</span>
              <p className="mt-0.5 font-medium text-slate-100 dark:text-slate-100">
                {profilesPagination.total} total
              </p>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Recommended:</span>
              <p className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                {rows.filter((r) => recommendationLabel(r) === "Recommended").length} this page
              </p>
            </div>
          </div>
          {opening.description ? (
            <MarkdownContent className="mt-3 line-clamp-2 border-t border-white/[0.06] pt-3 text-xs dark:border-slate-800">
              {opening.description}
            </MarkdownContent>
          ) : null}
        </section>
      ) : null}

      {profilesError ? (
        <div className="mb-4">
          <ErrorState
            title="Unable to load profiles"
            message={profilesError}
            onRetry={() => fetchProfiles(openingId, { page: profilePage, limit: 100 })}
          />
        </div>
      ) : null}
      {decisionError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {decisionError}
        </div>
      ) : null}

      {profilesLoading && rows.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {!profilesLoading && rows.length === 0 && !profilesError ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-[#0b0b0b] dark:border-slate-700 dark:bg-[#0b0b0b]/40">
          <EmptyState
            title="No candidates submitted yet"
            description="Profiles submitted by vendors for this opening will appear here with AI recommendations."
          />
        </div>
      ) : null}

      {rows.length > 0 ? (
        rows.length > 50 ? (
          <div
            ref={scrollRef}
            data-lenis-prevent
            className="relative max-h-[75vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-2 dark:border-slate-800 dark:bg-[#050505]/20"
            aria-label="Candidate profiles list"
          >
            <div style={{ height: virtual.totalHeight, position: "relative" }}>
              {visibleRows.map((p, index) => {
                const id = getId(p);
                return (
                  <VirtualizedCandidateRow
                    key={id}
                    id={id}
                    top={virtual.offsets[virtual.start + index]}
                    measureRow={virtual.measureRow}
                  >
                    <CandidateCard
                      profile={p}
                      onShortlist={(pid) => ask(pid, "shortlist")}
                      onReject={(pid) => ask(pid, "reject")}
                      canShortlist={canShortlist}
                      canReject={canReject}
                      busy={decisionLoadingId === id || acting}
                    />
                  </VirtualizedCandidateRow>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((p) => {
              const id = getId(p);
              return (
                <CandidateCard
                  key={id}
                  profile={p}
                  onShortlist={(pid) => ask(pid, "shortlist")}
                  onReject={(pid) => ask(pid, "reject")}
                  canShortlist={canShortlist}
                  canReject={canReject}
                  busy={decisionLoadingId === id || acting}
                />
              );
            })}
          </div>
        )
      ) : null}

      {profilesPagination.totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-center gap-3" aria-label="Candidate pages">
          <Button
            variant="outline"
            size="sm"
            disabled={profilePage <= 1 || profilesLoading}
            onClick={() => setProfilePage((page) => page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-300 dark:text-slate-300">
            Page {profilePage} of {profilesPagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={profilePage >= profilesPagination.totalPages || profilesLoading}
            onClick={() => setProfilePage((page) => page + 1)}
          >
            Next
          </Button>
        </nav>
      ) : null}

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "shortlist"
                ? "Shortlist this candidate?"
                : "Reject this candidate?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.action === "shortlist"
                ? "This will mark the candidate as shortlisted for this opening."
                : "This will mark the candidate as rejected for this opening."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={doAction}
              disabled={acting}
              className={
                confirm?.action === "reject"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }
            >
              {acting ? "Saving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
