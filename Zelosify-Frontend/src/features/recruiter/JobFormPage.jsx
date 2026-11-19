"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
  Save,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import useAuth from "@/hooks/Auth/useAuth";
import { createJob, getJobAssignees, getManagedJob, updateJob } from "@/features/recruiter/api";
import {
  canAssignHiringManagerToJob,
  canAssignRecruiterToJob,
  getJobAssignmentPayload,
  hasPermission,
} from "@/features/auth/permissions";

const emptyJob = {
  title: "",
  description: "",
  location: "Remote",
  contractType: "Full-Time",
  experienceMin: "0",
  experienceMax: "",
  requiredSkills: "",
  status: "OPEN",
  hiringManagerId: "",
  recruiterId: "",
};
const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-[#0b0b0b] px-3 py-2 text-sm outline-none focus:border-lime-600 focus:ring-2 focus:ring-lime-100 dark:border-slate-700 dark:bg-[#050505] dark:focus:ring-lime-950";

export default function JobFormPage({ jobId }) {
  const router = useRouter();
  const { user } = useAuth();
  const editing = Boolean(jobId);
  const canAssignManager = canAssignHiringManagerToJob(user);
  const canAssignRecruiter = canAssignRecruiterToJob(user);
  const canChooseManager = canAssignManager;
  const showTeamSection = canAssignManager || user?.role === "HIRING_MANAGER";
  const [form, setForm] = useState(emptyJob);
  const [originalDescription, setOriginalDescription] = useState("");
  const [originalAssignees, setOriginalAssignees] = useState({
    hiringManagerId: "",
    recruiterId: "",
  });
  const [state, setState] = useState({ loading: editing, saving: false, error: "" });
  const [assignees, setAssignees] = useState({ recruiters: [], hiringManagers: [] });
  const [assigneesState, setAssigneesState] = useState({ loading: true, error: "" });

  useEffect(() => {
    if (!canAssignRecruiter) {
      setAssigneesState({ loading: false, error: "" });
      return undefined;
    }
    let active = true;
    getJobAssignees()
      .then((data) => {
        if (!active) return;
        const choices = {
          recruiters: Array.isArray(data?.recruiters) ? data.recruiters : [],
          hiringManagers: Array.isArray(data?.hiringManagers) ? data.hiringManagers : [],
        };
        setAssignees(choices);
        setForm((current) => ({
          ...current,
          hiringManagerId:
            current.hiringManagerId || (user?.role === "HIRING_MANAGER" ? user.id : ""),
          recruiterId: current.recruiterId || (user?.role === "RECRUITER" ? user.id : ""),
        }));
        setAssigneesState({ loading: false, error: "" });
      })
      .catch(() => {
        if (active)
          setAssigneesState({ loading: false, error: "Team assignments could not be loaded." });
      });
    return () => {
      active = false;
    };
  }, [canAssignRecruiter, user?.id, user?.role]);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    getManagedJob(jobId)
      .then((job) => {
        if (!active) return;
        setForm({
          title: job.title ?? "",
          description: job.description ?? "",
          location: job.location ?? "Remote",
          contractType: job.contractType ?? "Full-Time",
          experienceMin: String(job.experienceMin ?? 0),
          experienceMax: job.experienceMax == null ? "" : String(job.experienceMax),
          requiredSkills: (job.requiredSkills ?? []).join(", "),
          status: job.status ?? "OPEN",
          hiringManagerId: job.hiringManager?.id ?? "",
          recruiterId: job.recruiter?.id ?? "",
        });
        setOriginalAssignees({
          hiringManagerId: job.hiringManager?.id ?? "",
          recruiterId: job.recruiter?.id ?? "",
        });
        setOriginalDescription(job.description ?? "");
        setState({ loading: false, saving: false, error: "" });
      })
      .catch(() => {
        if (active)
          setState({
            loading: false,
            saving: false,
            error: "This opening could not be loaded for editing.",
          });
      });
    return () => {
      active = false;
    };
  }, [editing, jobId]);

  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const normalizedDescription = form.description.trim();
  const descriptionChanged = !editing || normalizedDescription !== originalDescription.trim();
  const descriptionLengthIsValid =
    normalizedDescription.length >= 200 && normalizedDescription.length <= 700;
  const submit = async (event) => {
    event.preventDefault();
    const payload = {
      ...Object.fromEntries(
        Object.entries(form).filter(([key]) => key !== "hiringManagerId" && key !== "recruiterId")
      ),
      description: descriptionChanged ? normalizedDescription : undefined,
      experienceMin: Number(form.experienceMin),
      experienceMax: form.experienceMax === "" ? null : Number(form.experienceMax),
      requiredSkills: [
        ...new Set(
          form.requiredSkills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
        ),
      ],
      ...getJobAssignmentPayload({ user, editing, form, originalAssignees }),
    };
    if (descriptionChanged && !descriptionLengthIsValid) {
      setState((current) => ({
        ...current,
        error: "Job description must contain between 200 and 700 characters.",
      }));
      return;
    }
    if (payload.experienceMax !== null && payload.experienceMax < payload.experienceMin) {
      setState((current) => ({
        ...current,
        error: "Maximum experience must be at least the minimum.",
      }));
      return;
    }
    setState({ loading: false, saving: true, error: "" });
    try {
      const job = editing ? await updateJob(jobId, payload) : await createJob(payload);
      toast.success(editing ? "Opening updated." : "Opening created.");
      router.push(`/recruiter/jobs/${job.id}`);
    } catch (error) {
      setState({
        loading: false,
        saving: false,
        error:
          error?.response?.data?.message ||
          "The opening could not be saved. Review the fields and try again.",
      });
    }
  };

  const skillsPreview = [
    ...new Set(
      form.requiredSkills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    ),
  ];
  const selectedManager = assignees.hiringManagers.find(
    (person) => person.id === form.hiringManagerId
  );
  const selectedRecruiter = assignees.recruiters.find((person) => person.id === form.recruiterId);
  const backHref = editing ? `/recruiter/jobs/${encodeURIComponent(jobId)}` : "/recruiter/jobs";

  if (
    !user ||
    !["ADMIN", "RECRUITER", "HIRING_MANAGER"].includes(user.role) ||
    !hasPermission(user, editing ? "JOBS_UPDATE" : "JOBS_CREATE")
  )
    return <main className="p-8">You do not have permission to manage job openings.</main>;
  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-7 text-slate-50 dark:bg-[#050505] dark:text-white sm:px-7 sm:py-9 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-lime-300 dark:text-slate-300 dark:hover:text-lime-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{" "}
          {editing ? "Opening details" : "Job openings"}
        </Link>

        <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 text-white sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-lime-50">
                <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden="true" /> OPENING WORKSPACE
              </span>
              <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
                {editing ? "Edit opening" : "Create a job opening"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-lime-100 sm:text-base">
                {editing
                  ? "Update the role information and assigned recruiting team."
                  : "Set up a clear, complete role so candidates and your team know what comes next."}
              </p>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-lime-50">
              {editing ? "Editing existing opening" : "New opening"}
            </span>
          </div>
        </header>

        {state.error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
          >
            <span>{state.error}</span>
          </div>
        )}

        {state.loading ? (
          <div
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
            role="status"
            aria-label="Loading opening form"
          >
            <div className="h-[700px] animate-pulse rounded-2xl bg-[#262626] dark:bg-[#171717]" />
            <div className="h-80 animate-pulse rounded-2xl bg-[#262626] dark:bg-[#171717]" />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <form onSubmit={submit} className="space-y-5">
              <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-7">
                <SectionHeading
                  icon={FileText}
                  number="01"
                  title="Role basics"
                  description="Start with the information candidates need to understand the opportunity."
                />
                <div className="mt-6 space-y-5">
                  <div>
                    <label htmlFor="title" className="text-sm font-semibold">
                      Job title <span className="text-rose-600">*</span>
                    </label>
                    <input
                      required
                      minLength={3}
                      maxLength={200}
                      id="title"
                      name="title"
                      value={form.title}
                      onChange={change}
                      className={fieldClass}
                      placeholder="e.g. Senior Frontend Engineer"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="text-sm font-semibold">
                      Role description <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={change}
                      required={!editing}
                      minLength={descriptionChanged ? 200 : undefined}
                      maxLength={descriptionChanged ? 700 : undefined}
                      rows={7}
                      className={`${fieldClass} resize-y py-3`}
                      placeholder="Describe the responsibilities, team, and qualifications."
                      aria-describedby="description-help"
                    />
                    <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2 text-xs">
                      <p id="description-help" className="text-slate-500 dark:text-slate-400">
                        Write 200–700 characters covering the role, responsibilities, and
                        qualifications.
                      </p>
                      <span
                        aria-live="polite"
                        className={
                          descriptionChanged && !descriptionLengthIsValid
                            ? "font-medium text-amber-700 dark:text-amber-300"
                            : "text-slate-500 dark:text-slate-400"
                        }
                      >
                        {normalizedDescription.length}/700
                      </span>
                    </div>
                    {editing && !descriptionChanged && !descriptionLengthIsValid && (
                      <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                        This existing description is outside the current length rule. It will remain
                        unchanged unless you edit it.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-7">
                <SectionHeading
                  icon={MapPin}
                  number="02"
                  title="Work details"
                  description="Help candidates quickly understand where and how they will work."
                />
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="location" className="text-sm font-semibold">
                      Location
                    </label>
                    <input
                      id="location"
                      name="location"
                      value={form.location}
                      onChange={change}
                      className={fieldClass}
                      placeholder="Remote or city, region"
                    />
                  </div>
                  <div>
                    <label htmlFor="contractType" className="text-sm font-semibold">
                      Contract type
                    </label>
                    <select
                      id="contractType"
                      name="contractType"
                      value={form.contractType}
                      onChange={change}
                      className={fieldClass}
                    >
                      <option>Full-Time</option>
                      <option>Contract</option>
                      <option>Part-Time</option>
                      <option>Internship</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="experienceMin" className="text-sm font-semibold">
                      Minimum experience <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        id="experienceMin"
                        name="experienceMin"
                        type="number"
                        min="0"
                        max="50"
                        value={form.experienceMin}
                        onChange={change}
                        className={`${fieldClass} pr-16`}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        years
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="experienceMax" className="text-sm font-semibold">
                      Maximum experience
                    </label>
                    <div className="relative">
                      <input
                        id="experienceMax"
                        name="experienceMax"
                        type="number"
                        min="0"
                        max="50"
                        value={form.experienceMax}
                        onChange={change}
                        className={`${fieldClass} pr-16`}
                        placeholder="Optional"
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        years
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-7">
                <SectionHeading
                  icon={Sparkles}
                  number="03"
                  title="Skills & screening"
                  description="List the skills that matter most for this role."
                />
                <div className="mt-6">
                  <label htmlFor="requiredSkills" className="text-sm font-semibold">
                    Required skills
                  </label>
                  <input
                    id="requiredSkills"
                    name="requiredSkills"
                    value={form.requiredSkills}
                    onChange={change}
                    className={fieldClass}
                    placeholder="React, TypeScript, accessibility"
                    aria-describedby="requiredSkills-help"
                  />
                  <p
                    id="requiredSkills-help"
                    className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400"
                  >
                    Separate skills with commas. These saved skills are used for resume matching.
                    You can leave this blank if the role has no required skills.
                  </p>
                  {skillsPreview.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {skillsPreview.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full border border-lime-300/15 bg-[#141414] px-3 py-1.5 text-xs font-semibold text-lime-300 dark:border-lime-900 dark:bg-lime-950/50 dark:text-lime-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {showTeamSection && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-7">
                  <SectionHeading
                    icon={UsersRound}
                    number="04"
                    title="Opening team"
                    description="Assign the hiring manager and recruiter coordinating this role."
                  />
                  {assigneesState.error && (
                    <p
                      role="alert"
                      className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
                    >
                      {assigneesState.error}
                    </p>
                  )}
                  {!assigneesState.error &&
                    !assigneesState.loading &&
                    assignees.hiringManagers.length === 0 && (
                      <p
                        role="alert"
                        className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                      >
                        No hiring managers are available in this organization. Add a hiring manager
                        before saving.
                      </p>
                    )}
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    {canChooseManager ? (
                      <div>
                        <label htmlFor="hiringManagerId" className="text-sm font-semibold">
                          Hiring manager{" "}
                          <span className="text-xs font-normal text-slate-500">(optional)</span>
                        </label>
                        <select
                          id="hiringManagerId"
                          name="hiringManagerId"
                          value={form.hiringManagerId}
                          onChange={change}
                          disabled={assigneesState.loading || Boolean(assigneesState.error)}
                          className={fieldClass}
                        >
                          <option value="">
                            {assigneesState.loading ? "Loading managers…" : "Leave unassigned"}
                          </option>
                          {assignees.hiringManagers.map((person) => (
                            <option key={person.id} value={person.id}>
                              {[person.firstName, person.lastName].filter(Boolean).join(" ") ||
                                person.username ||
                                person.email}{" "}
                              · {person.email} · ID: {person.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold">Hiring manager</p>
                        <p className="mt-2 text-sm text-slate-300 dark:text-slate-300">
                          {selectedManager
                            ? [selectedManager.firstName, selectedManager.lastName]
                                .filter(Boolean)
                                .join(" ") || selectedManager.username
                            : "You"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Hiring managers can only assign themselves to an opening.
                        </p>
                      </div>
                    )}
                    {canAssignRecruiter && (
                      <div>
                        <label htmlFor="recruiterId" className="text-sm font-semibold">
                          Recruiter
                        </label>
                        <select
                          id="recruiterId"
                          name="recruiterId"
                          value={form.recruiterId}
                          onChange={change}
                          disabled={assigneesState.loading || Boolean(assigneesState.error)}
                          className={fieldClass}
                        >
                          <option value="">No recruiter assigned</option>
                          {assignees.recruiters.map((person) => (
                            <option key={person.id} value={person.id}>
                              {[person.firstName, person.lastName].filter(Boolean).join(" ") ||
                                person.username ||
                                person.email}{" "}
                              · {person.email} · ID: {person.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {editing && (
                <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-7">
                  <SectionHeading
                    icon={CheckCircle2}
                    number="05"
                    title="Opening status"
                    description="Control whether candidates can currently apply."
                  />
                  <div className="mt-5 max-w-sm">
                    <label htmlFor="status" className="text-sm font-semibold">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={change}
                      className={fieldClass}
                    >
                      <option value="OPEN">Open</option>
                      <option value="ON_HOLD">On hold</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </section>
              )}

              <div className="flex flex-col-reverse justify-end gap-3 rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-4 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b] sm:flex-row sm:p-5">
                <Link
                  href={backHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-sm font-semibold text-slate-200 transition hover:bg-[#0b0b0b] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#171717]"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={state.saving || (showTeamSection && assigneesState.loading)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-semibold text-black shadow-sm transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {state.saving ? "Saving…" : editing ? "Save opening" : "Publish opening"}
                </button>
              </div>
            </form>

            <aside className="space-y-4 lg:sticky lg:top-6">
              <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]">
                <div className="border-b border-white/[0.06] bg-[#0b0b0b] px-5 py-4 dark:border-slate-800 dark:bg-[#050505]/60">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-lime-300 dark:text-lime-300">
                    Live preview
                  </p>
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold leading-snug">
                    {form.title.trim() || "Your job title"}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#111111] px-2.5 py-1 text-xs font-medium text-slate-300 dark:bg-[#171717] dark:text-slate-300">
                      {form.location.trim() || "Location"}
                    </span>
                    <span className="rounded-full bg-[#111111] px-2.5 py-1 text-xs font-medium text-slate-300 dark:bg-[#171717] dark:text-slate-300">
                      {form.contractType || "Contract type"}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-300 dark:text-slate-400">
                    {form.description.trim() ||
                      "Your role description will appear here. Add responsibilities and qualifications to help candidates understand the opportunity."}
                  </p>
                  <div className="mt-4 border-t border-white/[0.06] pt-4 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Experience
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {form.experienceMin || "0"}
                      {form.experienceMax ? `–${form.experienceMax}` : "+"} years
                    </p>
                  </div>
                  {skillsPreview.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {skillsPreview.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-md bg-[#141414] px-2 py-1 text-[11px] font-medium text-lime-300 dark:bg-lime-500/10 dark:text-lime-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]">
                <h2 className="text-sm font-semibold">Opening checklist</h2>
                <ul className="mt-4 space-y-3 text-sm">
                  <ChecklistItem
                    done={form.title.trim().length >= 3}
                    label="Add a clear job title"
                  />
                  <ChecklistItem
                    done={form.location.trim().length > 0}
                    label="Set a work location"
                  />
                  <ChecklistItem
                    done={Boolean(form.hiringManagerId)}
                    label="Assign a hiring manager"
                    optional={!form.hiringManagerId && user?.role !== "HIRING_MANAGER"}
                  />
                  <ChecklistItem
                    done={descriptionLengthIsValid}
                    label="Write a 200–700 character role description"
                  />
                </ul>
              </section>

              <p className="flex items-start gap-2 rounded-xl bg-[#141414] p-4 text-xs leading-5 text-lime-100 dark:bg-lime-950/40 dark:text-lime-200">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Clear role details help candidates decide whether the opening fits their experience.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function SectionHeading({ icon: Icon, number, title, description }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#141414] text-lime-300 dark:bg-lime-500/10 dark:text-lime-300">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-lime-300 dark:text-lime-300">
          {number} / Opening setup
        </p>
        <h2 className="mt-1 text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label, optional = false }) {
  return (
    <li className="flex items-center gap-2.5">
      <CheckCircle2
        className={`h-4 w-4 shrink-0 ${done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-200"}`}
        aria-hidden="true"
      />
      <span
        className={
          done ? "text-slate-200 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
        }
      >
        {label}
      </span>
      {optional && (
        <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-400">Optional</span>
      )}
    </li>
  );
}
