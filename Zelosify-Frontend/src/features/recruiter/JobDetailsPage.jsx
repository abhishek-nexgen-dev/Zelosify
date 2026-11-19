"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Mail,
  MapPin,
  Pencil,
  ShieldCheck,
  XCircle,
  UserRound,
  UsersRound,
} from "lucide-react";
import useAuth from "@/hooks/Auth/useAuth";
import { formatDate } from "@/components/recruitment/format";
import Pagination from "@/components/recruitment/Pagination";
import { closeJob, getJobApplicants, getManagedJob } from "@/features/recruiter/api";
import { hasPermission } from "@/features/auth/permissions";
import MarkdownContent from "@/components/content/MarkdownContent";
import JobTeamAssignmentForm from "@/features/recruiter/JobTeamAssignmentForm";

const PAGE_SIZE = 20;
const candidateStatusFilters = [
  { value: "SUBMITTED", label: "In review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "REJECTED", label: "Rejected" },
];

const statusClasses = {
  OPEN: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200",
  CLOSED: "border-white/[0.08] bg-white/[0.04] text-slate-300",
  ON_HOLD: "border-amber-300/15 bg-amber-300/[0.08] text-amber-200",
};

function StatusBadge({ status }) {
  const label = status === "ON_HOLD" ? "On hold" : status === "OPEN" ? "Open" : "Closed";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClasses[status] || statusClasses.CLOSED}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  );
}

function experienceRange(job) {
  const minimum = job.experienceMin ?? 0;
  return job.experienceMax == null ? `${minimum}+ years` : `${minimum}–${job.experienceMax} years`;
}

function hiringManagerName(manager) {
  const name = [manager?.firstName, manager?.lastName].filter(Boolean).join(" ");
  return name || manager?.username || "Not assigned";
}

export default function JobDetailsPage({ jobId }) {
  const { user } = useAuth();
  const canManageJobsRole = ["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(user?.role);
  const canViewJobs = canManageJobsRole && hasPermission(user, "JOBS_VIEW");
  const canUpdateJobs = canManageJobsRole && hasPermission(user, "JOBS_UPDATE");
  const canViewCandidates =
    user?.role !== "IT_VENDOR" && canManageJobsRole && hasPermission(user, "CANDIDATES_VIEW");
  const [job, setJob] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [state, setState] = useState({ loading: true, error: "" });
  const [closeState, setCloseState] = useState({ confirming: false, saving: false, error: "" });
  const requestId = useRef(0);

  const loadJob = useCallback(async () => {
    const current = ++requestId.current;
    setState({ loading: true, error: "" });
    try {
      const result = await getManagedJob(jobId);
      if (requestId.current !== current) return;
      setJob(result);
      setState({ loading: false, error: "" });
    } catch (error) {
      if (requestId.current !== current) return;
      setState({
        loading: false,
        error:
          error?.response?.status === 404
            ? "This opening is unavailable to your account."
            : "Opening details could not be loaded. Check your connection and try again.",
      });
    }
  }, [jobId]);

  const confirmCloseJob = async () => {
    setCloseState({ confirming: true, saving: true, error: "" });
    try {
      const closedJob = await closeJob(jobId);
      setJob((current) => ({ ...current, ...closedJob }));
      setCloseState({ confirming: false, saving: false, error: "" });
    } catch (error) {
      setCloseState({
        confirming: true,
        saving: false,
        error: error?.response?.data?.message || "The opening could not be closed.",
      });
    }
  };

  const updateJobTeam = ({ hiringManager, recruiter }) => {
    setJob((current) => ({ ...current, hiringManager, recruiter }));
  };

  const tabs = [
    { id: "overview", label: "Overview", detail: "Role details", icon: BriefcaseBusiness },
    ...(canViewCandidates
      ? [{ id: "candidates", label: "Candidates", detail: "Applications", icon: UsersRound }]
      : []),
    { id: "team", label: "Team", detail: "Hiring contacts", icon: UserRound },
  ];

  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;
    else return;

    event.preventDefault();
    const nextTab = tabs[nextIndex].id;
    setActiveTab(nextTab);
    document.getElementById(`opening-tab-${nextTab}`)?.focus();
  };

  useEffect(() => {
    if (canViewJobs) void loadJob();
    return () => {
      requestId.current += 1;
    };
  }, [canViewJobs, loadJob, user?.id, user?.role]);

  if (!canViewJobs) {
    return (
      <main className="min-h-screen bg-black p-8 text-slate-300">
        You do not have permission to view this opening.
      </main>
    );
  }

  if (state.loading) {
    return (
      <main className="min-h-screen bg-black px-4 py-8 text-slate-100 sm:px-7 lg:px-10">
        <div
          className="mx-auto max-w-6xl animate-pulse space-y-5"
          role="status"
          aria-label="Loading opening"
        >
          <div className="h-5 w-36 rounded bg-[#151515]" />
          <div className="h-56 rounded-3xl bg-[#151515]" />
          <div className="h-16 rounded-2xl bg-[#151515]" />
          <div className="h-72 rounded-2xl bg-[#151515]" />
        </div>
      </main>
    );
  }

  if (state.error || !job) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-slate-100 sm:px-7">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/recruiter/jobs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-lime-200 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Job openings
          </Link>
          <section
            role="alert"
            className="mt-6 rounded-2xl border border-rose-300/15 bg-rose-300/[0.06] p-6 text-sm text-rose-200"
          >
            <p>{state.error || "Opening not found."}</p>
            <button
              type="button"
              onClick={() => void loadJob()}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-7 text-slate-100 sm:px-7 sm:py-9 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Link
          href="/recruiter/jobs"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-lime-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All job openings
        </Link>

        <header className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#171717] via-[#090909] to-black p-6 text-white shadow-2xl shadow-black/50 sm:p-9">
          <div
            className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-lime-400/15 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200">
                  <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" /> Opening details
                </span>
                <StatusBadge status={job.status} />
              </div>
              {canUpdateJobs && (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/recruiter/jobs/${encodeURIComponent(job.id)}/edit`}
                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-white transition hover:border-lime-300/30 hover:bg-lime-300/10"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" /> Edit opening
                  </Link>
                  {job.status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => setCloseState({ confirming: true, saving: false, error: "" })}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200/40 bg-rose-500/15 px-3 text-sm font-semibold text-white hover:bg-rose-500/30"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" /> Close opening
                    </button>
                  )}
                </div>
              )}
            </div>
            {closeState.confirming && (
              <div
                className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-white"
                role="group"
                aria-label="Confirm close opening"
              >
                <div>
                  <p className="font-semibold">Close this opening?</p>
                  <p className="mt-1 text-lime-100">
                    It will stop appearing in public job search. Candidate records will be kept.
                  </p>
                  {closeState.error && (
                    <p role="alert" className="mt-2 text-rose-200">
                      {closeState.error}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void confirmCloseJob()}
                    disabled={closeState.saving}
                    className="min-h-9 rounded-lg bg-rose-600 px-3 font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {closeState.saving ? "Closing…" : "Confirm close"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCloseState({ confirming: false, saving: false, error: "" })}
                    disabled={closeState.saving}
                    className="min-h-9 rounded-lg border border-white/25 px-3 font-semibold text-white hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{job.title}</h1>
                <p className="mt-2 text-base font-medium text-lime-200">
                  {job.tenant?.companyName || "Your organization"}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {job.location || "Remote"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                  {job.contractType || "Full-time"}
                </span>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap gap-2 text-xs font-medium text-slate-200">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                {experienceRange(job)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
                Posted {formatDate(job.postedDate)}
              </span>
            </div>
          </div>
        </header>

        <section className="w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0b0b] shadow-2xl shadow-black/40">
          <div
            className="border-b border-white/[0.08] bg-[#050505] p-3 sm:p-4"
            role="tablist"
            aria-label="Opening information"
          >
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map(({ id, label, detail, icon: Icon }, index) => {
                const selected = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`opening-tab-${id}`}
                    aria-selected={selected}
                    aria-controls={`opening-panel-${id}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActiveTab(id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={`flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-2xl px-2 py-2.5 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-400 sm:min-h-[4.25rem] sm:justify-start sm:px-4 ${selected ? "bg-[#1b1b1b] text-lime-100 shadow-sm ring-1 ring-white/[0.08]" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-lime-400/10 text-lime-200" : "bg-white/[0.04] text-slate-400"}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-xs font-bold sm:text-sm">{label}</span>
                      <span
                        className={`mt-0.5 hidden truncate text-[11px] sm:block ${selected ? "text-slate-400" : "text-slate-500"}`}
                      >
                        {detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {activeTab === "overview" ? (
            <div
              role="tabpanel"
              id="opening-panel-overview"
              aria-labelledby="opening-tab-overview"
              className="space-y-7 p-5 sm:p-8"
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <InfoTile icon={MapPin} label="Location" value={job.location || "Remote"} />
                <InfoTile
                  icon={BriefcaseBusiness}
                  label="Contract type"
                  value={job.contractType || "Full-time"}
                />
                <InfoTile icon={ShieldCheck} label="Experience" value={experienceRange(job)} />
                <InfoTile icon={CalendarDays} label="Posted" value={formatDate(job.postedDate)} />
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
                <section className="rounded-2xl border border-white/[0.08] bg-[#111111] p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-lime-400/10 p-2.5 text-lime-200">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-white">Role description</h2>
                      <p className="mt-0.5 text-xs text-slate-400">
                        The responsibilities and context for this opening
                      </p>
                    </div>
                  </div>
                  {job.description ? (
                    <MarkdownContent className="mt-5">{job.description}</MarkdownContent>
                  ) : (
                    <p className="mt-5 text-sm leading-7 text-slate-400">
                      No description provided.
                    </p>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="rounded-xl bg-sky-400/10 p-2.5 text-sky-200">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h2 className="font-semibold text-white">Hiring manager</h2>
                        <p className="mt-0.5 text-xs text-slate-400">Opening point of contact</p>
                      </div>
                    </div>
                    {job.hiringManager ? (
                      <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#080808] p-4">
                        <p className="font-semibold">{hiringManagerName(job.hiringManager)}</p>
                        {job.hiringManager.username && (
                          <p className="mt-1 text-sm text-slate-400">
                            @{job.hiringManager.username}
                          </p>
                        )}
                        {job.hiringManager.id && (
                          <p className="mt-1 break-all font-mono text-xs text-slate-400">
                            ID: {job.hiringManager.id}
                          </p>
                        )}
                        {job.hiringManager.email && (
                          <a
                            href={`mailto:${job.hiringManager.email}`}
                            className="mt-3 inline-flex items-center gap-2 break-all text-sm font-medium text-lime-200 hover:text-lime-100 hover:underline"
                          >
                            <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                            {job.hiringManager.email}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="mt-5 rounded-xl border border-white/[0.06] bg-[#080808] p-4 text-sm text-slate-400">
                        No hiring manager is assigned.
                      </p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-[#111111] p-5 sm:p-6">
                    <h2 className="font-semibold text-white">Important dates</h2>
                    <DateRow
                      label="Expected completion"
                      value={formatDate(job.expectedCompletionDate)}
                    />
                    <DateRow label="Action date" value={formatDate(job.actionDate)} />
                  </div>
                </section>
              </div>

              <section className="rounded-2xl border border-white/[0.08] bg-[#111111] p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-violet-400/10 p-2.5 text-violet-200">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-white">Required skills</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Skills listed for this role</p>
                  </div>
                </div>
                {job.requiredSkills?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {job.requiredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-lime-300/10 bg-lime-400/[0.08] px-3 py-1.5 text-xs font-semibold text-lime-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">No required skills listed.</p>
                )}
              </section>
            </div>
          ) : activeTab === "candidates" && canViewCandidates ? (
            <div
              role="tabpanel"
              id="opening-panel-candidates"
              aria-labelledby="opening-tab-candidates"
              className="w-full min-w-0 p-4 sm:p-7 lg:p-8"
            >
              <CandidatesPanel jobId={jobId} />
            </div>
          ) : (
            <section
              role="tabpanel"
              id="opening-panel-team"
              aria-labelledby="opening-tab-team"
              className="p-5 sm:p-8"
            >
              <div className="max-w-2xl">
                <h2 className="text-xl font-bold">Opening team</h2>
                <p className="mt-1 text-sm text-slate-400">
                  People assigned to coordinate this role and its hiring process.
                </p>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <TeamMemberCard
                  title="Hiring manager"
                  person={job.hiringManager}
                  emptyMessage="No hiring manager is assigned to this opening."
                />
                <TeamMemberCard
                  title="Recruiter"
                  person={job.recruiter}
                  emptyMessage="No recruiter is assigned to this opening."
                />
              </div>
              <JobTeamAssignmentForm job={job} user={user} onSaved={updateJobTeam} />
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#080808] p-4">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4 text-lime-300" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function DateRow({ label, value }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-4 text-sm">
      <span className="inline-flex items-center gap-2 text-slate-400">
        <Clock3 className="h-4 w-4 text-lime-300" aria-hidden="true" />
        {label}
      </span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function TeamMemberCard({ title, person, emptyMessage }) {
  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#111111] p-5 shadow-sm shadow-black/30 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-lime-400/10 p-2.5 text-lime-200">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
          <h3 className="mt-0.5 font-semibold text-white">
            {person ? hiringManagerName(person) : "Unassigned"}
          </h3>
        </div>
      </div>
      {person ? (
        <div className="mt-5 space-y-2 border-t border-white/[0.07] pt-4 text-sm">
          {person.username && <p className="text-slate-300">@{person.username}</p>}
          {person.email && (
            <a
              href={`mailto:${person.email}`}
              className="inline-flex items-center gap-2 break-all font-medium text-lime-200 hover:text-lime-100 hover:underline"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              {person.email}
            </a>
          )}
          {person.id && (
            <p className="break-all font-mono text-xs text-slate-400">ID: {person.id}</p>
          )}
        </div>
      ) : (
        <p className="mt-5 border-t border-white/[0.07] pt-4 text-sm text-slate-400">
          {emptyMessage}
        </p>
      )}
    </article>
  );
}

function recommendationStyle(band) {
  if (band === "Recommended")
    return "border border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-200";
  if (band === "Borderline") return "border border-amber-300/15 bg-amber-300/[0.08] text-amber-200";
  if (band === "Not Recommended" || band === "Failed")
    return "border border-rose-300/15 bg-rose-300/[0.08] text-rose-200";
  return "border border-white/[0.08] bg-white/[0.04] text-slate-300";
}

function screeningLabel(screening = {}) {
  if (screening.status === "FAILED") return "Failed";
  if (screening.status === "PROCESSING") return "Processing";
  if (screening.status !== "COMPLETED") return "Pending";
  return screening.band || "Completed";
}

function CandidatesPanel({ jobId }) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [result, setResult] = useState({
    candidates: [],
    pagination: { totalPages: 1 },
    totalCandidates: 0,
  });
  const [state, setState] = useState({ loading: true, error: "" });
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setState({ loading: true, error: "" });
    try {
      const response = await getJobApplicants(jobId, {
        page,
        limit: PAGE_SIZE,
        status: statusFilter,
      });
      if (requestId.current !== current) return;
      setResult(response);
      setState({ loading: false, error: "" });
    } catch (error) {
      if (requestId.current !== current) return;
      setState({
        loading: false,
        error:
          error?.response?.status === 404
            ? "This opening is unavailable to your account."
            : "Candidates could not be loaded. Check your connection and try again.",
      });
    }
  }, [jobId, page, statusFilter]);

  useEffect(() => {
    void load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  return (
    <div className="w-full min-w-0">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#171717] via-[#0b0b0b] to-black p-5 shadow-lg shadow-black/40 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lime-400/10 text-lime-200">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-lime-300">
              Candidate pipeline
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              Applications for this opening
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-400">
              Review the active queue, or switch to shortlisted and rejected applications.
            </p>
          </div>
        </div>
        {!state.loading && !state.error && (
          <div className="flex items-baseline gap-2 self-start rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5 shadow-sm sm:self-center">
            <span className="text-2xl font-bold tabular-nums text-lime-200">
              {result.totalCandidates || 0}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {candidateStatusFilters.find((filter) => filter.value === statusFilter)?.label ||
                "applications"}
            </span>
          </div>
        )}
      </header>

      <div
        className="mt-5 flex flex-wrap gap-2"
        role="group"
        aria-label="Filter applications by status"
      >
        {candidateStatusFilters.map((filter) => {
          const selected = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setPage(1);
                setStatusFilter(filter.value);
              }}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 ${selected ? "border-lime-300/30 bg-lime-300/10 text-lime-100" : "border-white/[0.08] bg-[#0b0b0b] text-slate-300 hover:border-white/20 hover:bg-[#151515] hover:text-white"}`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {state.error && (
        <div
          role="alert"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] p-4 text-sm text-rose-200"
        >
          <span>{state.error}</span>
          <button type="button" onClick={() => void load()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {state.loading && (
        <div className="mt-5 grid w-full gap-4" role="status" aria-label="Loading candidates">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-48 w-full animate-pulse rounded-2xl border border-white/[0.05] bg-[#141414]"
            />
          ))}
        </div>
      )}

      {!state.loading && !state.error && result.candidates?.length === 0 && (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-[#080808] px-6 py-16 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-[#111111] text-slate-400 shadow-sm">
            <UsersRound className="h-7 w-7" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-semibold text-white">
            No{" "}
            {candidateStatusFilters
              .find((filter) => filter.value === statusFilter)
              ?.label.toLowerCase()}{" "}
            applications
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Applications matching this status will appear here.
          </p>
        </div>
      )}

      {!state.loading && !state.error && result.candidates?.length > 0 && (
        <>
          <div className="mt-5 grid w-full min-w-0 grid-cols-1 gap-4">
            {result.candidates.map((candidate) => {
              const screening = candidate.aiScreening || {};
              const band = screeningLabel(screening);
              return (
                <article
                  key={candidate.applicationId}
                  className="w-full min-w-0 rounded-2xl border border-white/[0.08] bg-[#090909] p-5 shadow-lg shadow-black/40 transition hover:border-lime-300/20 hover:bg-[#0e0e0e] sm:p-6 lg:p-7"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-lime-300/10 bg-lime-400/[0.08] text-lime-200">
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-white">
                          {candidate.candidate?.name || "Candidate"}
                        </h3>
                        <p className="mt-1 truncate text-sm text-slate-400">
                          {candidate.candidate?.email || "Email unavailable"}
                        </p>
                        {candidate.candidate?.mobileNumber && (
                          <a
                            href={`tel:${candidate.candidate.mobileNumber}`}
                            className="mt-1 block text-sm text-slate-400 hover:text-lime-200 hover:underline"
                          >
                            {candidate.candidate.mobileNumber}
                          </a>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${recommendationStyle(band)}`}
                    >
                      {band}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <CandidateMetric
                      label="Match score"
                      value={screening.score == null ? "—" : `${screening.score}%`}
                    />
                    <CandidateMetric
                      label="Confidence"
                      value={screening.confidence == null ? "—" : `${screening.confidence}%`}
                    />
                    <CandidateMetric
                      label="ATS match"
                      value={screening.atsScore == null ? "—" : `${screening.atsScore}/100`}
                    />
                    <CandidateMetric label="Application" value={candidate.status || "SUBMITTED"} />
                    <CandidateMetric
                      label={
                        candidate.shortlistedAt
                          ? "Shortlisted"
                          : candidate.rejectedAt
                            ? "Rejected"
                            : "Submitted"
                      }
                      value={
                        candidate.shortlistedAt
                          ? formatDate(candidate.shortlistedAt)
                          : candidate.rejectedAt
                            ? formatDate(candidate.rejectedAt)
                            : candidate.submittedAt
                              ? formatDate(candidate.submittedAt)
                              : "—"
                      }
                    />
                  </div>
                  {screening.resumeAnalysis && (
                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Extracted resume profile
                      </p>
                      <p className="mt-2 text-sm text-slate-200">
                        {screening.resumeAnalysis.experienceYears} years experience ·{" "}
                        {screening.resumeAnalysis.location || "Location not found"}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Education:{" "}
                        {(screening.resumeAnalysis.education || []).join(", ") || "Not found"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(screening.resumeAnalysis.skills || []).slice(0, 12).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-lime-300/10 bg-lime-400/[0.08] px-2 py-1 text-xs text-lime-200"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#111111] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      AI screening
                    </p>
                    <div className="mt-2">
                      <MarkdownContent>
                        {screening.reason ||
                          (screening.status === "PROCESSING"
                            ? "Screening is in progress."
                            : screening.status === "FAILED"
                              ? "Screening could not be completed."
                              : "No screening explanation is available yet.")}
                      </MarkdownContent>
                    </div>
                    {screening.version && (
                      <p className="mt-2 text-xs text-slate-500">
                        Model {screening.version}
                        {screening.latencyMs != null ? ` · ${screening.latencyMs} ms` : ""}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                    <span className="truncate text-sm text-slate-400">
                      {candidate.resume?.fileName || "Resume not available"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/applications/${candidate.applicationId}/score`}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-lime-300/15 bg-lime-400/[0.06] px-3 text-sm font-semibold text-lime-200 transition hover:border-lime-300/30 hover:bg-lime-200/[0.12]"
                      >
                        View score
                      </Link>
                      {candidate.resume?.previewUrl ? (
                        <a
                          href={candidate.resume.previewUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/[0.09] px-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.04]"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" /> Preview resume
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Resume preview unavailable</span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <Pagination
            page={page}
            totalPages={result.pagination?.totalPages || 1}
            onPageChange={setPage}
            disabled={state.loading}
          />
        </>
      )}
    </div>
  );
}

function CandidateMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.07] bg-[#111111] p-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
