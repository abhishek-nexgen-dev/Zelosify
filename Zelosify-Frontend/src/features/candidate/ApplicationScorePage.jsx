"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileText,
  Gauge,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import MarkdownContent from "@/components/content/MarkdownContent";
import PageLoader from "@/components/recruitment/PageLoader";
import { hasPermission } from "@/features/auth/permissions";
import { getMyApplicationScore } from "@/features/candidate/api";
import { decideApplicant, getCandidateApplicationScore } from "@/features/recruiter/api";
import useAuth from "@/hooks/Auth/useAuth";

const bandStyles = {
  Recommended: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200",
  Borderline: "border-amber-300/15 bg-amber-300/[0.08] text-amber-200",
  "Not Recommended": "border-rose-300/15 bg-rose-300/[0.08] text-rose-200",
};

function formatStatus(status) {
  return (
    {
      PENDING: "Queued for analysis",
      PROCESSING: "Analyzing resume",
      COMPLETED: "Analysis complete",
      FAILED: "Analysis unavailable",
    }[status] || "Analysis pending"
  );
}

export default function ApplicationScorePage({ applicationId }) {
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [state, setState] = useState({ loading: true, error: "" });
  const [retryKey, setRetryKey] = useState(0);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const isCandidate = user?.role === "CANDIDATE";
  const canReviewApplications = ["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(user?.role);
  const canApprove = canReviewApplications && hasPermission(user, "CANDIDATES_SHORTLIST");
  const canReject = canReviewApplications && hasPermission(user, "CANDIDATES_REJECT");

  useEffect(() => {
    let active = true;
    if (!user || !applicationId) return undefined;
    if (!isCandidate && (!canReviewApplications || !hasPermission(user, "CANDIDATES_VIEW"))) {
      setState({
        loading: false,
        error: "Your account does not have permission to view candidate scores.",
      });
      return undefined;
    }

    setState({ loading: true, error: "" });
    const fetchScore = isCandidate ? getMyApplicationScore : getCandidateApplicationScore;
    fetchScore(applicationId)
      .then((result) => {
        if (active) {
          setApplication(result);
          setState({ loading: false, error: "" });
        }
      })
      .catch((error) => {
        if (active) {
          setState({
            loading: false,
            error:
              error?.response?.status === 404
                ? "This application is not available to your account."
                : error?.response?.status === 403
                  ? "Your account does not have permission to view this score."
                  : "Resume analysis could not be loaded. Please try again.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [applicationId, canReviewApplications, isCandidate, retryKey, user]);

  const backHref = isCandidate
    ? "/candidate/applications"
    : user?.role === "HIRING_MANAGER"
      ? "/hiring-manager/openings"
      : "/recruiter/jobs";
  const screening = application?.aiScreening || {};
  const score =
    typeof screening.score === "number" && Number.isFinite(screening.score)
      ? screening.score
      : null;
  const hasCompletedScore = screening.status === "COMPLETED" && score !== null;
  const isDecided = application?.status === "SHORTLISTED" || application?.status === "REJECTED";

  const saveDecision = async () => {
    if (!pendingDecision || savingDecision) return;
    setSavingDecision(true);
    try {
      const result = await decideApplicant(applicationId, pendingDecision);
      setApplication((current) => ({
        ...current,
        status: result?.status || (pendingDecision === "shortlist" ? "SHORTLISTED" : "REJECTED"),
      }));
      toast.success(
        pendingDecision === "shortlist"
          ? "Candidate approved and shortlisted."
          : "Candidate rejected."
      );
      setPendingDecision(null);
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          "The candidate decision could not be saved. Please refresh and try again."
      );
    } finally {
      setSavingDecision(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link
          href={backHref}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to{" "}
          {isCandidate ? "my applications" : "candidate review"}
        </Link>

        {state.loading && (
          <PageLoader label="Loading resume score…" className="min-h-[55vh] text-slate-300" />
        )}

        {!state.loading && state.error && (
          <section
            role="alert"
            className="rounded-3xl border border-rose-300/15 bg-[#0b0b0b] p-6 sm:p-8"
          >
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-200">
              Score unavailable
            </p>
            <h1 className="mt-3 text-2xl font-bold text-white">
              We couldn’t open this resume analysis.
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">{state.error}</p>
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="mt-5 inline-flex min-h-10 items-center rounded-xl border border-white/10 px-4 text-sm font-semibold text-white hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </section>
        )}

        {!state.loading && !state.error && application && (
          <>
            <header className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-br from-[#111111] via-[#0b0b0b] to-[#0b0b0b] p-6 shadow-[0_28px_80px_-45px_rgba(36,47,82,0.8)] sm:rounded-[2rem] sm:p-9 lg:p-10">
              <div
                className="pointer-events-none absolute -right-20 -top-32 -z-10 h-96 w-96 rounded-full bg-lime-500/15 blur-[100px]"
                aria-hidden="true"
              />
              <p className="inline-flex items-center gap-2 rounded-full border border-lime-300/20 bg-lime-300/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-100 sm:text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-cyan-200" aria-hidden="true" /> Resume
                insights
              </p>
              <div className="mt-5 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div className="min-w-0">
                  <h1 className="break-words text-2xl font-bold tracking-[-0.04em] text-white sm:text-3xl lg:text-4xl">
                    {application.jobTitle || "Candidate score"}
                  </h1>
                  {application.candidate?.name && (
                    <p className="mt-2 break-words text-sm font-semibold text-white">
                      {application.candidate.name}
                      {application.candidate.email && (
                        <span className="font-normal text-slate-400">
                          {" "}
                          · {application.candidate.email}
                        </span>
                      )}
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
                    <BriefcaseBusiness className="h-4 w-4 text-lime-200" aria-hidden="true" />
                    <span>{application.companyName || "Organization"}</span>
                    {application.location && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span>{application.location}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold ${bandStyles[screening.band] || "border-white/10 bg-white/[0.04] text-slate-200"}`}
                  >
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />{" "}
                    {screening.band || formatStatus(screening.status)}
                  </span>
                  <span className="inline-flex min-h-9 items-center rounded-full border border-white/[0.08] bg-black/20 px-3 text-xs font-semibold text-slate-300">
                    {application.status || "SUBMITTED"}
                  </span>
                </div>
              </div>
            </header>

            {!isCandidate && (canApprove || canReject) && (
              <section
                className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                aria-label="Candidate decision"
              >
                <div>
                  <h2 className="font-semibold text-white">Hiring decision</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-400">
                    Use the resume score as decision support. Your choice will update this
                    application.
                  </p>
                </div>
                {isDecided ? (
                  <span
                    className={`inline-flex min-h-10 items-center rounded-xl border px-4 text-sm font-semibold ${application.status === "SHORTLISTED" ? "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200" : "border-rose-300/20 bg-rose-300/[0.08] text-rose-200"}`}
                  >
                    {application.status === "SHORTLISTED" ? "Approved · Shortlisted" : "Rejected"}
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {canApprove && (
                      <button
                        type="button"
                        onClick={() => setPendingDecision("shortlist")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
                      >
                        <Check className="h-4 w-4" aria-hidden="true" /> Approve &amp; shortlist
                      </button>
                    )}
                    {canReject && (
                      <button
                        type="button"
                        onClick={() => setPendingDecision("reject")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300/20 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-300/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"
                      >
                        <X className="h-4 w-4" aria-hidden="true" /> Reject
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            {hasCompletedScore ? (
              <section className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <article className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#111111] to-[#0d1018] p-6 text-center sm:p-8">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-lime-300/10 bg-lime-400/[0.08] text-lime-200">
                    <Gauge className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    AI match score
                  </p>
                  <p className="mt-2 text-6xl font-extrabold tracking-[-0.06em] text-white sm:text-7xl">
                    {score}
                    <span className="ml-1 text-2xl font-semibold tracking-normal text-slate-500">
                      /100
                    </span>
                  </p>
                  <div
                    className="mt-5 h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/[0.07]"
                    role="img"
                    aria-label={`AI match score ${score} out of 100`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-lime-400 to-cyan-300"
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                  </div>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
                    The score is based on the resume features and opening requirements identified
                    during analysis.
                  </p>
                </article>

                <div className="grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    label="AI confidence"
                    value={screening.confidence == null ? "—" : `${screening.confidence}%`}
                    detail="Heuristic confidence estimate"
                  />
                  <MetricCard
                    label="ATS match"
                    value={screening.atsScore == null ? "—" : `${screening.atsScore}/100`}
                    detail="Skills, experience, and location"
                  />
                  <MetricCard
                    label="Analysis time"
                    value={screening.latencyMs == null ? "—" : `${screening.latencyMs} ms`}
                    detail="Time spent processing this resume"
                  />
                  <MetricCard
                    label="Analysis status"
                    value="Complete"
                    detail={
                      screening.version ? `Model ${screening.version}` : "Saved recommendation"
                    }
                  />
                  <article className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 sm:col-span-2 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/[0.1] text-lime-200">
                        <FileText className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="font-semibold text-white">Recommendation reason</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Why this match score was assigned</p>
                      </div>
                    </div>
                    <div className="mt-5">
                      <MarkdownContent>
                        {screening.reason || "No explanation was provided for this score."}
                      </MarkdownContent>
                    </div>
                  </article>
                </div>
              </section>
            ) : (
              <section
                role={screening.status === "FAILED" ? "alert" : undefined}
                className={`rounded-3xl border bg-[#0b0b0b] p-6 sm:p-8 ${screening.status === "FAILED" ? "border-rose-300/15" : "border-white/[0.08]"}`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${screening.status === "FAILED" ? "bg-rose-300/10 text-rose-200" : "bg-violet-300/10 text-violet-200"}`}
                  >
                    <Clock3 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {application.analysisIssue === "IDENTITY_UNVERIFIED"
                        ? "Resume identity could not be verified"
                        : formatStatus(screening.status)}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      {screening.status === "FAILED"
                        ? screening.reason ||
                          (application.analysisIssue === "IDENTITY_UNVERIFIED"
                            ? "The name on this resume could not be verified against your candidate profile. Check your profile name and replace the resume to request a fresh analysis."
                            : "This resume analysis could not be completed. Replace the resume to request a fresh analysis.")
                        : "The AI score will appear here after resume analysis finishes. You can return to this page at any time."}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-slate-500">
              AI scores are decision support, not a hiring decision. Confidence is a heuristic
              estimate and is not a calibrated probability.
            </p>
          </>
        )}
      </div>
      <AlertDialog
        open={Boolean(pendingDecision)}
        onOpenChange={(open) => {
          if (!open && !savingDecision) setPendingDecision(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDecision === "reject"
                ? "Reject this application?"
                : "Approve and shortlist this candidate?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDecision === "reject"
                ? "This will mark the application as rejected and queue the configured rejection email."
                : "This will shortlist the candidate and queue the configured shortlist email."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingDecision}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={savingDecision}
              onClick={(event) => {
                event.preventDefault();
                saveDecision();
              }}
              className={
                pendingDecision === "reject"
                  ? "bg-rose-700 hover:bg-rose-800"
                  : "bg-emerald-700 hover:bg-emerald-800"
              }
            >
              {savingDecision
                ? "Saving…"
                : pendingDecision === "reject"
                  ? "Confirm rejection"
                  : "Confirm approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-white sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}
