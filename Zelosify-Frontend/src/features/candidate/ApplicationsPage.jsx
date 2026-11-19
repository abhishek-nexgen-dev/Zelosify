"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CircleCheck,
  ClipboardList,
  Clock3,
  FileText,
  RefreshCw,
  RotateCw,
  ScanSearch,
  SearchCheck,
} from "lucide-react";
import { toast } from "sonner";
import MarkdownContent from "@/components/content/MarkdownContent";
import useAuth from "@/hooks/Auth/useAuth";
import {
  getApplications,
  replaceApplicationResume,
  retryApplicationAnalysis,
} from "@/features/candidate/api";

const screeningLabel = (status) =>
  ({
    PENDING: "Queued",
    PROCESSING: "Analyzing resume",
    COMPLETED: "Analysis complete",
    FAILED: "Analysis unavailable",
  })[status] || "Queued";
const statusStyle = (status) =>
  status === "SHORTLISTED"
    ? "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200"
    : status === "REJECTED"
      ? "border-rose-300/15 bg-rose-300/[0.08] text-rose-200"
      : "border-sky-300/15 bg-sky-300/[0.08] text-sky-200";
const applicationStatusLabel = (status) =>
  ({
    SUBMITTED: "Submitted",
    SHORTLISTED: "Shortlisted",
    REJECTED: "Not selected",
  })[status] ||
  status ||
  "Submitted";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [summary, setSummary] = useState({ total: 0, inReview: 0, shortlisted: 0, screening: 0 });
  const [applications, setApplications] = useState([]);
  const [state, setState] = useState({ loading: true, error: "" });
  const [uploadingId, setUploadingId] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const requestId = useRef(0);
  const requestController = useRef(null);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      requestController.current?.abort();
      const controller = new AbortController();
      requestController.current = controller;
      const currentRequestId = ++requestId.current;
      if (!quiet) setState({ loading: true, error: "" });
      try {
        const result = await getApplications({ page, limit: 20 }, { signal: controller.signal });
        if (requestId.current !== currentRequestId || controller.signal.aborted) return;
        setApplications(result.data || []);
        setPagination(result.pagination || { page: 1, totalPages: 1, total: result.count || 0 });
        setSummary(
          result.summary || { total: result.count || 0, inReview: 0, shortlisted: 0, screening: 0 }
        );
        setState({ loading: false, error: "" });
      } catch {
        if (!controller.signal.aborted && requestId.current === currentRequestId && !quiet) {
          setState({ loading: false, error: "Your applications could not be loaded." });
        }
      }
    },
    [page]
  );

  useEffect(() => {
    if (user?.role === "CANDIDATE") load();
    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [user?.id, user?.role, load]);

  useEffect(() => {
    if (
      !applications.some((application) =>
        ["PENDING", "PROCESSING"].includes(application.screeningStatus)
      )
    )
      return;
    const intervalId = window.setInterval(() => load({ quiet: true }), 5000);
    return () => window.clearInterval(intervalId);
  }, [applications, load]);

  const updateResume = async (applicationId, file) => {
    if (!file) return;
    if (file.size <= 0 || file.size > 10 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(file.name)) {
      toast.error("Choose a PDF, DOC, or DOCX resume smaller than 10 MB.");
      return;
    }
    if (uploadingId !== null) return;
    setUploadingId(applicationId);
    setUploadProgress(0);
    try {
      await replaceApplicationResume(applicationId, file, setUploadProgress);
      toast.success("Resume updated. Screening has been restarted.");
      await load();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Resume update failed. Please try again.");
    } finally {
      setUploadingId(null);
      setUploadProgress(0);
    }
  };

  const retryAnalysis = async (applicationId) => {
    if (retryingId !== null) return;
    setRetryingId(applicationId);
    try {
      await retryApplicationAnalysis(applicationId);
      toast.success("Resume analysis queued. Your resume does not need to be uploaded again.");
      setApplications((current) =>
        current.map((application) =>
          application.applicationId === applicationId
            ? { ...application, screeningStatus: "PROCESSING" }
            : application
        )
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not retry resume analysis.");
    } finally {
      setRetryingId(null);
    }
  };

  if (!user)
    return <main className="mx-auto max-w-5xl p-8 pt-24">Sign in to view your applications.</main>;
  if (user.role !== "CANDIDATE")
    return (
      <main className="mx-auto max-w-5xl p-8 pt-24 text-slate-200">
        This page is available to candidate accounts.
      </main>
    );

  return (
    <main className="min-h-screen bg-[#050505] px-4 py-6 text-slate-100 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl space-y-7 lg:space-y-9">
        <header className="relative isolate overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0b0b0b] p-6 shadow-[0_28px_80px_-50px_rgba(0,0,0,0.95)] sm:rounded-[1.75rem] sm:p-9 lg:flex lg:items-end lg:justify-between lg:gap-8 lg:p-10">
          <div
            className="pointer-events-none absolute -right-16 -top-32 -z-10 h-80 w-80 rounded-full bg-lime-300/[0.07] blur-[100px]"
            aria-hidden="true"
          />
          <div className="max-w-2xl">
            <Link
              href="/candidate/dashboard"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-lime-200"
            >
              Candidate workspace <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /> My
              applications
            </Link>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-300/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200 sm:text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-300" aria-hidden="true" />{" "}
              Application tracker
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-white sm:text-4xl lg:text-[3rem]">
              My applications
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              See where each application stands, review your resume analysis, and update a resume
              when needed.
            </p>
          </div>
          <Link
            href="/jobs"
            className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-bold text-black shadow-lg shadow-lime-950/20 transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 lg:mt-0 lg:shrink-0"
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" /> Find more jobs{" "}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        {!state.loading && !state.error && (
          <section
            aria-label="Application summary"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              {
                label: "Applications",
                value: summary.total,
                note: "Submitted by you",
                icon: ClipboardList,
                tone: "text-lime-200 bg-lime-300/[0.08]",
              },
              {
                label: "In review",
                value: summary.inReview,
                note: "Awaiting a decision",
                icon: Clock3,
                tone: "text-sky-200 bg-sky-300/[0.08]",
              },
              {
                label: "Shortlisted",
                value: summary.shortlisted,
                note: "Selected to move forward",
                icon: BadgeCheck,
                tone: "text-emerald-200 bg-emerald-300/[0.08]",
              },
              {
                label: "Resume analysis",
                value: summary.screening,
                note: "Analysis in progress",
                icon: ScanSearch,
                tone: "text-violet-200 bg-violet-300/[0.08]",
              },
            ].map(({ label, value, note, icon: Icon, tone }) => (
              <article
                key={label}
                className="group rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 transition hover:border-white/[0.14] sm:p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-400">{label}</p>
                    <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight text-white">
                      {value ?? 0}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500">{note}</p>
                  </div>
                  <span className={`rounded-xl p-3 ring-1 ring-inset ring-white/[0.06] ${tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}

        {state.error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.06] p-4 text-sm text-rose-100"
          >
            {state.error}
            <button
              type="button"
              onClick={() => void load()}
              className="min-h-9 rounded-lg px-3 font-semibold underline underline-offset-4 hover:bg-white/[0.05]"
            >
              Try again
            </button>
          </div>
        )}
        {state.loading && (
          <div className="space-y-3" role="status" aria-label="Loading applications">
            {[1, 2, 3].map((key) => (
              <div
                key={key}
                className="h-40 animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111]"
              />
            ))}
          </div>
        )}
        {!state.loading && !state.error && applications.length === 0 && (
          <section className="rounded-3xl border border-dashed border-white/[0.12] bg-[#0b0b0b] px-6 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-300/15 bg-lime-300/[0.06] text-lime-200">
              <SearchCheck className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-white">
              Your next opportunity starts here
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">
              When you apply, your application status and resume screening progress will appear
              here.
            </p>
            <Link
              href="/jobs"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-bold text-black transition hover:bg-lime-200"
            >
              Browse open jobs <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        )}
        {!state.loading && applications.length > 0 && (
          <section aria-label="Your submitted applications" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3 px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-lime-200">
                  Application history
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">Your submitted applications</h2>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300">
                {pagination.total} total
              </span>
            </div>
            {applications.map((application) => (
              <article
                key={application.applicationId}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.95)] transition hover:border-lime-300/20 sm:rounded-3xl sm:p-6 lg:p-7"
              >
                <div
                  className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-lime-300/[0.035] blur-3xl transition group-hover:bg-lime-300/[0.07]"
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-lime-200">
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> Application #
                      {application.applicationId}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white sm:text-xl">
                      {application.jobTitle}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {[application.companyName, application.location]
                        .filter(Boolean)
                        .join(" · ") || "Opening details"}
                    </p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Applied{" "}
                      {application.submittedAt
                        ? new Date(application.submittedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle(application.status)}`}
                  >
                    {applicationStatusLabel(application.status)}
                  </span>
                </div>
                <div className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                  <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.06] bg-[#111111] p-4">
                    <span className="rounded-xl bg-white/[0.05] p-2.5 text-slate-200">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-100">Resume analysis</p>
                      <p
                        className={`mt-1 text-xs leading-5 ${application.screeningStatus === "FAILED" ? "text-rose-200" : "text-slate-400"}`}
                      >
                        {screeningLabel(application.screeningStatus)}
                        {application.screeningStatus === "FAILED"
                          ? application.analysisIssue === "IDENTITY_UNVERIFIED"
                            ? ". See the identity check details below."
                            : application.analysisRetryAvailable
                              ? ". Your application is still submitted. Retry the analysis without uploading your resume again."
                              : ". Your application is still submitted, but the analysis retry limit has been reached. Contact support for help."
                          : application.screeningStatus === "PROCESSING"
                            ? ". This may take a few moments."
                            : ""}
                      </p>
                      {application.analysisIssue === "IDENTITY_UNVERIFIED" && (
                        <div
                          role="alert"
                          className="mt-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] p-3"
                        >
                          <p className="text-xs font-semibold text-rose-200">
                            Resume name could not be verified
                          </p>
                          <p className="mt-1 text-xs leading-5 text-rose-100/80">
                            Check that your profile name matches the name printed on your resume,
                            then replace the file to request a new analysis.
                          </p>
                        </div>
                      )}
                      {application.screeningStatus === "COMPLETED" &&
                        application.aiScreening?.reason && (
                          <div className="mt-3 rounded-xl border border-lime-300/10 bg-lime-300/[0.035] p-3">
                            <p className="text-xs font-semibold text-lime-100">
                              Recommendation reason
                            </p>
                            <MarkdownContent className="mt-1 space-y-1 text-xs [&_p]:text-xs [&_p]:leading-5">
                              {application.aiScreening.reason}
                            </MarkdownContent>
                          </div>
                        )}
                      {application.screeningStatus === "FAILED" &&
                        application.analysisIssue !== "IDENTITY_UNVERIFIED" &&
                        application.aiScreening?.reason && (
                          <div
                            role="alert"
                            className="mt-3 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-3"
                          >
                            <p className="text-xs font-semibold text-amber-100">Analysis issue</p>
                            <p className="mt-1 text-xs leading-5 text-amber-100/80">
                              {application.aiScreening.reason}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {application.resumeUrl && (
                      <a
                        href={application.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.08] px-3 text-sm font-semibold text-slate-300 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
                      >
                        View resume
                      </a>
                    )}
                    <Link
                      href={`/applications/${application.applicationId}/score`}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-lime-300/20 bg-lime-300/[0.06] px-3.5 text-sm font-semibold text-lime-100 transition hover:border-lime-200/40 hover:bg-lime-300/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" /> View score
                    </Link>
                    {application.analysisRetryAvailable && (
                      <button
                        type="button"
                        onClick={() => void retryAnalysis(application.applicationId)}
                        disabled={retryingId !== null}
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3.5 text-sm font-semibold text-amber-100 transition hover:border-amber-200/40 hover:bg-amber-300/[0.12] disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
                      >
                        <RotateCw
                          className={`h-4 w-4 ${retryingId === application.applicationId ? "animate-spin" : ""}`}
                          aria-hidden="true"
                        />
                        {retryingId === application.applicationId ? "Queuing…" : "Retry analysis"}
                      </button>
                    )}
                    <label
                      className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] px-3 text-sm font-semibold text-slate-300 transition hover:border-white/[0.15] hover:bg-white/[0.04] hover:text-white ${uploadingId !== null ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {uploadingId === application.applicationId
                        ? `Uploading ${uploadProgress}%`
                        : "Replace resume"}
                      <input
                        className="sr-only"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        disabled={uploadingId !== null}
                        onChange={(event) => {
                          updateResume(application.applicationId, event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                </div>
                <p className="mt-2 text-right text-[11px] leading-5 text-slate-500">
                  Resume limit: PDF, DOC, or DOCX · 10 MB · 2 pages · 12,000 characters
                </p>
              </article>
            ))}
          </section>
        )}
        {!state.loading && !state.error && pagination.total > 0 && (
          <nav
            aria-label="Application pages"
            className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-4 sm:flex-row"
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
              className="min-h-10 w-full rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Previous
            </button>
            <p role="status" className="text-center text-sm text-slate-400">
              Page {page} of {pagination.totalPages} · {pagination.total} applications
            </p>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
              className="min-h-10 w-full rounded-xl border border-white/[0.08] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
            >
              Next
            </button>
          </nav>
        )}
      </div>
    </main>
  );
}
