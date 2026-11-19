"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, UserRound } from "lucide-react";
import { toast } from "sonner";
import useAuth from "@/hooks/Auth/useAuth";
import MarkdownContent from "@/components/content/MarkdownContent";
import { decideApplicant, getJobApplicants } from "@/features/recruiter/api";
import { hasPermission } from "@/features/auth/permissions";
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

const bandStyle = (label) =>
  label === "Recommended"
    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
    : label === "Borderline"
      ? "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
      : label === "Not Recommended"
        ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
        : label === "Failed"
          ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200"
          : "bg-[#111111] text-slate-200 dark:bg-[#171717] dark:text-slate-200";

export default function ApplicantsPage({ jobId }) {
  const { user } = useAuth();
  const canRecruitingRole = ["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(user?.role);
  const canReviewCandidateProfiles = user?.role !== "IT_VENDOR" && canRecruitingRole;
  const canViewCandidates = canReviewCandidateProfiles && hasPermission(user, "CANDIDATES_VIEW");
  const canShortlist = canReviewCandidateProfiles && hasPermission(user, "CANDIDATES_SHORTLIST");
  const canReject = canReviewCandidateProfiles && hasPermission(user, "CANDIDATES_REJECT");
  const [result, setResult] = useState({ candidates: [], pagination: { page: 1, totalPages: 1 } });
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: "" });
  const [pendingAction, setPendingAction] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setState({ loading: true, error: "" });
    try {
      setResult(await getJobApplicants(jobId, { page, limit: 20 }));
      setState({ loading: false, error: "" });
    } catch (error) {
      setState({
        loading: false,
        error:
          error?.response?.status === 404
            ? "This opening is unavailable to your account."
            : "Applicants could not be loaded.",
      });
    }
  }, [jobId, page]);
  useEffect(() => {
    if (canViewCandidates) load();
  }, [canViewCandidates, load]);

  const commitDecision = async () => {
    if (!pendingAction) return;
    setBusyId(pendingAction.applicationId);
    try {
      await decideApplicant(pendingAction.applicationId, pendingAction.action);
      toast.success(
        pendingAction.action === "shortlist" ? "Candidate shortlisted." : "Candidate rejected."
      );
      setPendingAction(null);
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "The decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  };

  if (!canViewCandidates)
    return <main className="p-8">You do not have permission to view applicants.</main>;
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-7 lg:px-10">
      <Link
        href="/recruiter/jobs"
        className="inline-flex items-center gap-2 text-sm font-medium text-lime-300 hover:underline dark:text-lime-300"
      >
        <ArrowLeft className="h-4 w-4" /> Job openings
      </Link>
      <header className="mt-5">
        <p className="text-sm font-semibold text-lime-300 dark:text-lime-300">
          Recruiting workspace
        </p>
        <h1 className="mt-2 text-3xl font-bold">{result.job?.title || "Applicants"}</h1>
        <p className="mt-2 text-sm text-slate-300 dark:text-slate-300">
          Review applications and AI screening as decision support. You make the final hiring
          decision.
        </p>
      </header>
      {state.error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {state.error}{" "}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}
      {state.loading && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((x) => (
            <div key={x} className="h-64 animate-pulse rounded-xl bg-[#111111] dark:bg-[#0b0b0b]" />
          ))}
        </div>
      )}
      {!state.loading && !state.error && result.candidates?.length === 0 && (
        <section className="mt-6 rounded-xl border border-dashed border-slate-700 bg-[#0b0b0b] p-12 text-center dark:border-slate-700 dark:bg-[#0b0b0b]">
          <UserRound className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 font-semibold">No applicants yet</h2>
          <p className="mt-1 text-sm text-slate-500">
            Applications for this opening will appear here.
          </p>
        </section>
      )}
      {!state.loading && result.candidates?.length > 0 && (
        <>
          <p className="mt-6 text-sm text-slate-300 dark:text-slate-300">
            {result.totalCandidates} applicant{result.totalCandidates === 1 ? "" : "s"} · Page{" "}
            {page} of {result.pagination?.totalPages || 1}
          </p>
          <section className="mt-3 grid gap-4 xl:grid-cols-2">
            {result.candidates.map((candidate) => {
              const screening = candidate.aiScreening || {};
              const band =
                screening.status === "FAILED"
                  ? "Failed"
                  : screening.status !== "COMPLETED"
                    ? screening.status === "PROCESSING"
                      ? "Processing"
                      : "Pending"
                    : screening.band;
              return (
                <article
                  key={candidate.applicationId}
                  className="rounded-xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-[#111111] p-3 dark:bg-[#171717]">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="font-semibold">
                          {candidate.candidate?.name || "Candidate"}
                        </h2>
                        <p className="mt-1 text-sm text-slate-300 dark:text-slate-300">
                          {candidate.candidate?.email || "Email unavailable"}
                        </p>
                        {candidate.candidate?.mobileNumber && (
                          <a
                            href={`tel:${candidate.candidate.mobileNumber}`}
                            className="mt-1 block text-sm text-slate-300 hover:underline dark:text-slate-300"
                          >
                            {candidate.candidate.mobileNumber}
                          </a>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${bandStyle(band)}`}
                    >
                      {band}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <Metric
                      label="Match score"
                      value={
                        screening.status === "COMPLETED" && screening.score != null
                          ? `${screening.score}%`
                          : "—"
                      }
                    />
                    <Metric
                      label="Confidence"
                      value={
                        screening.status === "COMPLETED" && screening.confidence != null
                          ? `${screening.confidence}%`
                          : "—"
                      }
                    />
                    <Metric
                      label="ATS match"
                      value={screening.atsScore == null ? "—" : `${screening.atsScore}/100`}
                    />
                    <Metric
                      label="Processing"
                      value={screening.latencyMs != null ? `${screening.latencyMs} ms` : "—"}
                    />
                    <Metric label="Application" value={candidate.status || "SUBMITTED"} />
                  </div>
                  {screening.resumeAnalysis && (
                    <div className="mt-3 rounded-lg border border-white/[0.06] p-4 dark:border-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resume profile extracted by AI
                      </p>
                      <p className="mt-2 text-sm text-slate-200 dark:text-slate-200">
                        {screening.resumeAnalysis.experienceYears} years experience ·{" "}
                        {screening.resumeAnalysis.location || "Location not found"}
                      </p>
                      <p className="mt-1 text-sm text-slate-300 dark:text-slate-300">
                        Education:{" "}
                        {(screening.resumeAnalysis.education || []).join(", ") || "Not found"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(screening.resumeAnalysis.skills || []).slice(0, 12).map((skill) => (
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
                  <div className="mt-4 rounded-lg bg-[#0b0b0b] p-4 dark:bg-[#171717]/60">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Resume analysis
                    </p>
                    <div className="mt-2">
                      <MarkdownContent>
                        {screening.status === "PROCESSING" || screening.status === "PENDING"
                          ? "Analyzing resume… Recommendation will appear here when ready."
                          : screening.status === "FAILED"
                            ? "Analysis could not be completed. Review the resume directly."
                            : screening.reason || "No explanation available."}
                      </MarkdownContent>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 dark:border-slate-800">
                    <div className="flex flex-wrap gap-4 text-sm">
                      {candidate.resume?.previewUrl && (
                        <a
                          href={candidate.resume.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 font-medium text-lime-300 hover:underline dark:text-lime-300"
                        >
                          <FileText className="h-4 w-4" /> Preview resume
                        </a>
                      )}
                      <span className="text-slate-500">
                        {candidate.resume?.fileName || "Resume"} ·{" "}
                        {candidate.submittedAt
                          ? new Date(candidate.submittedAt).toLocaleDateString()
                          : "Date unavailable"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/applications/${candidate.applicationId}/score`}
                        className="inline-flex min-h-10 items-center rounded-lg border border-lime-300/15 px-3 text-sm font-semibold text-lime-300 transition hover:bg-[#141414] dark:border-lime-900 dark:text-lime-300 dark:hover:bg-lime-950/40"
                      >
                        View score
                      </Link>
                      {canShortlist && (
                        <button
                          type="button"
                          disabled={
                            busyId === candidate.applicationId || candidate.status === "SHORTLISTED"
                          }
                          onClick={() =>
                            setPendingAction({
                              applicationId: candidate.applicationId,
                              action: "shortlist",
                              name: candidate.candidate?.name,
                            })
                          }
                          className="min-h-10 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                        >
                          {candidate.status === "SHORTLISTED" ? "Shortlisted" : "Shortlist"}
                        </button>
                      )}
                      {canReject && (
                        <button
                          type="button"
                          disabled={
                            busyId === candidate.applicationId || candidate.status === "REJECTED"
                          }
                          onClick={() =>
                            setPendingAction({
                              applicationId: candidate.applicationId,
                              action: "reject",
                              name: candidate.candidate?.name,
                            })
                          }
                          className="min-h-10 rounded-lg border border-rose-300 px-3 text-sm font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950"
                        >
                          {candidate.status === "REJECTED" ? "Rejected" : "Reject"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
          <nav className="mt-6 flex justify-center gap-4" aria-label="Applicant pages">
            <button
              disabled={page <= 1}
              onClick={() => setPage((n) => n - 1)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              Previous
            </button>
            <span className="py-2 text-sm">
              Page {page} of {result.pagination?.totalPages || 1}
            </span>
            <button
              disabled={page >= (result.pagination?.totalPages || 1)}
              onClick={() => setPage((n) => n + 1)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm disabled:opacity-40 dark:border-slate-700"
            >
              Next
            </button>
          </nav>
        </>
      )}
      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && busyId == null) setPendingAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === "reject"
                ? "Reject this application?"
                : "Shortlist this candidate?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === "reject"
                ? `This will mark ${pendingAction?.name || "the candidate"} as rejected for this opening.`
                : `This will mark ${pendingAction?.name || "the candidate"} as shortlisted for this opening.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId != null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId != null}
              onClick={(event) => {
                event.preventDefault();
                commitDecision();
              }}
              className={
                pendingAction?.action === "reject"
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }
            >
              {busyId != null ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-white/[0.06] p-3 dark:border-slate-800">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
