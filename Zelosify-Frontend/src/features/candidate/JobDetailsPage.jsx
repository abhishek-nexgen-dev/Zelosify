"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  FileText,
  MapPin,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";
import { toast } from "sonner";
import LandingNavbar from "@/components/LandingPage/navbar/LandingNavbar";
import MarkdownContent from "@/components/content/MarkdownContent";
import useAuth from "@/hooks/Auth/useAuth";
import { applyForJob, getJob } from "@/features/candidate/api";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getExperienceRange(job) {
  if (job.experienceMin == null && job.experienceMax == null) return null;
  if (job.experienceMax == null) return `${job.experienceMin ?? 0}+ years`;
  return `${job.experienceMin ?? 0}–${job.experienceMax} years`;
}

function formatFileSize(size) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function JobSkeleton() {
  return (
    <div className="mt-7 grid animate-pulse gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="h-[34rem] rounded-3xl border border-white/[0.07] bg-[#0b0b0b]" />
      <div className="h-[28rem] rounded-3xl border border-white/[0.07] bg-[#0b0b0b]" />
    </div>
  );
}

export default function JobDetailsPage({ jobId }) {
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [pageState, setPageState] = useState({ loading: true, error: "" });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const openingIsOpen = job?.status === "OPEN";

  useEffect(() => {
    let active = true;
    setPageState({ loading: true, error: "" });
    getJob(jobId)
      .then((value) => {
        if (!active) return;
        setJob(value);
        setPageState({ loading: false, error: "" });
      })
      .catch(() => {
        if (active)
          setPageState({
            loading: false,
            error: "This job is unavailable or could not be loaded.",
          });
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  const selectFile = (selected) => {
    setSubmitError("");
    if (!selected) return;
    if (selected.size <= 0 || selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setSubmitError("Choose a resume that is no larger than 10 MB.");
      toast.error("Choose a resume smaller than 10 MB.");
      return;
    }
    if (!ALLOWED_TYPES.has(selected.type) || !/\.(pdf|doc|docx)$/i.test(selected.name)) {
      setFile(null);
      setSubmitError("Resume must be a PDF, DOC, or DOCX file.");
      toast.error("Resume must be a PDF, DOC, or DOCX file.");
      return;
    }
    setFile(selected);
  };

  const submitApplication = async (event) => {
    event.preventDefault();
    setSubmitError("");
    if (!user) {
      toast.message("Sign in as a candidate to apply.");
      return;
    }
    if (user.role !== "CANDIDATE") {
      setSubmitError("Applications can only be submitted from a candidate account.");
      return;
    }
    if (!file) {
      setSubmitError("Choose your resume before submitting the application.");
      return;
    }

    setSubmitting(true);
    setProgress(0);
    try {
      await applyForJob(jobId, file, setProgress);
      setSubmitted(true);
      setFile(null);
      toast.success("Resume received. Your application is being screened.");
    } catch (error) {
      const message =
        error?.response?.data?.message || "We could not submit your application. Please try again.";
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const requiredSkills = Array.isArray(job?.requiredSkills)
    ? job.requiredSkills.filter((skill) => typeof skill === "string" && skill.trim())
    : [];
  const experience = job ? getExperienceRange(job) : null;

  return (
    <div className="dark min-h-screen overflow-x-clip bg-[#050505] text-slate-100">
      <LandingNavbar />
      <main className="relative isolate min-h-screen overflow-hidden pb-16 pt-24 sm:pt-28">
        <div
          className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[32rem] w-[32rem] rounded-full bg-lime-600/10 blur-[110px]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10">
          <Link
            href="/jobs"
            className="inline-flex min-h-9 items-center gap-2 rounded-lg pr-3 text-sm font-semibold text-slate-400 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Find Jobs
          </Link>

          {pageState.loading && <JobSkeleton />}

          {pageState.error && (
            <div
              role="alert"
              className="mt-7 rounded-3xl border border-rose-400/20 bg-[#0b0b0b] p-6 sm:p-8"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-400/10 text-rose-200">
                <X className="h-5 w-5" aria-hidden="true" />
              </span>
              <h1 className="mt-4 text-xl font-bold text-white">Job not available</h1>
              <p className="mt-2 text-sm leading-6 text-slate-400">{pageState.error}</p>
              <Link
                href="/jobs"
                className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold text-white hover:bg-white/[0.05]"
              >
                Browse open roles <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          )}

          {job && (
            <>
              <header className="relative mt-6 overflow-hidden rounded-[1.6rem] border border-white/[0.08] bg-gradient-to-br from-[#0b0b0b] via-[#0b0b0b] to-[#0b0b0b] px-5 py-7 shadow-[0_24px_70px_rgba(0,0,0,.22)] sm:rounded-[2rem] sm:px-8 sm:py-9 lg:px-10 lg:py-10">
                <div
                  className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border-[40px] border-lime-400/[0.055]"
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-2 rounded-full border border-lime-300/15 bg-lime-400/[0.08] px-3 py-1.5 text-xs font-semibold text-lime-100">
                      <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {job.companyName || "Zelosify opportunity"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${openingIsOpen ? "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-200" : "border-slate-500/20 bg-white/[0.04] text-slate-400"}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${openingIsOpen ? "bg-emerald-400" : "bg-slate-500"}`}
                        aria-hidden="true"
                      />
                      {openingIsOpen ? "Open role" : "Closed"}
                    </span>
                  </div>
                  <h1 className="mt-5 max-w-4xl text-3xl font-extrabold leading-[1.08] tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                    {job.title}
                  </h1>
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-sm font-medium text-slate-200">
                      <MapPin className="h-4 w-4 text-lime-300" aria-hidden="true" />
                      {job.location || "Remote"}
                    </span>
                    {job.contractType && (
                      <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-sm font-medium text-slate-200">
                        <BriefcaseBusiness className="h-4 w-4 text-lime-300" aria-hidden="true" />
                        {job.contractType}
                      </span>
                    )}
                    {experience && (
                      <span className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-sm font-medium text-slate-200">
                        <BadgeCheck className="h-4 w-4 text-lime-300" aria-hidden="true" />
                        {experience} experience
                      </span>
                    )}
                  </div>
                </div>
              </header>

              <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6">
                <article className="min-w-0 rounded-3xl border border-white/[0.07] bg-[#0b0b0b] p-5 sm:p-7 lg:p-8">
                  <section>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime-200">
                      Role overview
                    </p>
                    <h2 className="mt-2 text-xl font-bold tracking-tight text-white">
                      About the role
                    </h2>
                    {job.description ? (
                      <MarkdownContent className="mt-4 sm:[&_p]:text-base sm:[&_p]:leading-8">
                        {job.description}
                      </MarkdownContent>
                    ) : (
                      <p className="mt-4 text-sm leading-7 text-slate-300 sm:text-base sm:leading-8">
                        The hiring team will share more details during the application process.
                      </p>
                    )}
                  </section>

                  {requiredSkills.length > 0 && (
                    <section className="mt-8 border-t border-white/[0.08] pt-7">
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime-300/10 bg-lime-400/[0.07] text-lime-200">
                          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                          <h2 className="font-bold text-white">Skills for this role</h2>
                          <p className="mt-1 text-sm text-slate-400">
                            Key skills listed by the hiring team.
                          </p>
                        </div>
                      </div>
                      <ul className="mt-4 flex flex-wrap gap-2" aria-label="Required skills">
                        {requiredSkills.map((skill) => (
                          <li
                            key={skill}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-slate-200"
                          >
                            {skill}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section className="mt-8 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.045] p-4 sm:p-5">
                    <div className="flex gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-200">
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="text-sm font-bold text-white">
                          Your application stays connected
                        </h2>
                        <p className="mt-1.5 text-sm leading-6 text-slate-400">
                          After applying, check your candidate dashboard for screening and
                          application updates.
                        </p>
                      </div>
                    </div>
                  </section>
                </article>

                <aside className="h-fit rounded-3xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-[0_16px_45px_rgba(0,0,0,.2)] sm:p-6 lg:sticky lg:top-24">
                  <div className="flex items-center gap-3 border-b border-white/[0.08] pb-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-lime-300/10 bg-lime-400/[0.08] text-lime-200">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-400">Application</p>
                      <h2 className="mt-0.5 font-bold text-white">Apply for this role</h2>
                    </div>
                  </div>

                  {!openingIsOpen ? (
                    <div
                      role="status"
                      className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-sm leading-6 text-slate-300"
                    >
                      This role is closed and is no longer accepting applications.
                    </div>
                  ) : submitted ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className="mt-5 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4 sm:p-5"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300/10 text-emerald-200">
                        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-4 text-lg font-bold text-white">Resume received</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        We’ve received your resume. Your application is now being screened. You can
                        also check its progress on your candidate dashboard.
                      </p>
                      <Link
                        href="/candidate/dashboard"
                        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 text-sm font-bold text-slate-50 transition hover:bg-emerald-200"
                      >
                        Go to my dashboard <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                  ) : !user ? (
                    <div className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                      <p className="text-sm leading-6 text-slate-300">
                        Sign in to your candidate account to upload a resume and apply.
                      </p>
                      <Link
                        href={`/login?returnTo=${encodeURIComponent(`/jobs/${jobId}`)}`}
                        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-bold text-black transition hover:bg-lime-300"
                      >
                        Sign in to apply <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <p className="mt-3 text-center text-xs text-slate-500">
                        New to Zelosify?{" "}
                        <Link
                          href="/register"
                          className="font-semibold text-lime-200 hover:text-white"
                        >
                          Create an account
                        </Link>
                      </p>
                    </div>
                  ) : user.role !== "CANDIDATE" ? (
                    <div
                      role="status"
                      className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4 text-sm leading-6 text-slate-300"
                    >
                      Resume applications are available to candidate accounts.
                    </div>
                  ) : (
                    <form onSubmit={submitApplication} className="mt-5 space-y-4">
                      <label
                        htmlFor="resume"
                        className={`block cursor-pointer rounded-2xl border border-dashed px-4 py-5 transition focus-within:ring-2 focus-within:ring-lime-400 ${file ? "border-lime-300/35 bg-lime-400/[0.06]" : "border-white/15 bg-white/[0.025] hover:border-lime-300/35 hover:bg-lime-200/[0.04]"}`}
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400/10 text-lime-200">
                          <UploadCloud className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="mt-3 block break-all text-sm font-semibold text-white">
                          {file?.name || "Choose your resume"}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">
                          PDF, DOC, or DOCX · up to 10 MB · maximum 2 pages and 12,000 characters
                        </span>
                        {file && (
                          <span className="mt-2 block text-xs text-lime-200">
                            Ready to upload · {formatFileSize(file.size)}
                          </span>
                        )}
                        <input
                          id="resume"
                          name="file"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="sr-only"
                          onChange={(event) => {
                            selectFile(event.target.files?.[0]);
                            event.target.value = "";
                          }}
                          disabled={submitting}
                        />
                      </label>

                      {submitError && (
                        <p
                          role="alert"
                          className="rounded-xl border border-rose-300/15 bg-rose-300/[0.06] p-3 text-xs leading-5 text-rose-200"
                        >
                          {submitError}
                        </p>
                      )}

                      {submitting && (
                        <div
                          aria-live="polite"
                          className="rounded-xl border border-white/[0.07] bg-black/15 p-3"
                        >
                          <div className="flex justify-between gap-3 text-xs text-slate-300">
                            <span>Uploading your resume</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-lime-400 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!file || submitting}
                        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-bold text-black shadow-lg shadow-lime-950/25 transition hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {submitting ? "Uploading resume…" : "Submit application"}
                        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <p className="text-center text-xs leading-5 text-slate-500">
                        Your resume is shared with the hiring team for this opening.
                      </p>
                    </form>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
