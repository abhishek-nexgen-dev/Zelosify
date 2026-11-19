"use client";

import { useEffect, useState } from "react";
import { Save, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { getJobAssignees, updateJob } from "@/features/recruiter/api";
import {
  canAssignHiringManagerToJob,
  canAssignRecruiterToJob,
  canManageJobTeam,
} from "@/features/auth/permissions";

const fieldClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#080808] px-3 text-sm text-slate-100 outline-none focus:border-lime-300/50 focus:ring-4 focus:ring-lime-500/10 disabled:opacity-60";

function getAssignmentErrorMessage(error) {
  const responseData = error?.response?.data;
  if (typeof responseData?.message === "string" && responseData.message.trim()) {
    return responseData.message;
  }
  if (Array.isArray(responseData?.details)) {
    const detailMessages = responseData.details
      .map((detail) => detail?.message)
      .filter((message) => typeof message === "string" && message.trim());
    if (detailMessages.length) return detailMessages.join(" ");
  }
  if (typeof responseData?.error === "string" && responseData.error !== "Validation failed") {
    return responseData.error;
  }
  if (!error?.response) {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (error.response.status === 401 || error.response.status === 403) {
    return "You do not have permission to change this opening team. Refresh your session and try again.";
  }
  return `The opening team update was rejected (HTTP ${error.response.status}). Please review the selected team members and try again.`;
}

export default function JobTeamAssignmentForm({ job, user, onSaved }) {
  const canAssignManager = canAssignHiringManagerToJob(user);
  const canAssignRecruiter = canAssignRecruiterToJob(user);
  const canEditTeam = canManageJobTeam(user);
  const [assignees, setAssignees] = useState({ recruiters: [], hiringManagers: [] });
  const [form, setForm] = useState({
    hiringManagerId: job.hiringManager?.id || "",
    recruiterId: job.recruiter?.id || "",
  });
  const [state, setState] = useState({
    loading: canEditTeam,
    saving: false,
    error: "",
    success: "",
  });

  useEffect(() => {
    setForm({ hiringManagerId: job.hiringManager?.id || "", recruiterId: job.recruiter?.id || "" });
  }, [job.hiringManager?.id, job.recruiter?.id]);

  useEffect(() => {
    if (!canEditTeam) return undefined;
    let active = true;
    getJobAssignees()
      .then((result) => {
        if (!active) return;
        setAssignees({
          recruiters: Array.isArray(result?.recruiters) ? result.recruiters : [],
          hiringManagers: Array.isArray(result?.hiringManagers) ? result.hiringManagers : [],
        });
        setState((current) => ({ ...current, loading: false, error: "" }));
      })
      .catch(() => {
        if (active)
          setState((current) => ({
            ...current,
            loading: false,
            error: "Team members could not be loaded. Try again.",
          }));
      });
    return () => {
      active = false;
    };
  }, [canEditTeam, job.id]);

  const change = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setState((current) => ({ ...current, error: "", success: "" }));
  };

  const save = async (event) => {
    event.preventDefault();
    const originalHiringManagerId = job.hiringManager?.id || "";
    const originalRecruiterId = job.recruiter?.id || "";
    const managerChanged = canAssignManager && form.hiringManagerId !== originalHiringManagerId;
    const recruiterChanged = form.recruiterId !== originalRecruiterId;
    const payload = {
      ...(managerChanged ? { hiringManagerId: form.hiringManagerId || null } : {}),
      ...(recruiterChanged ? { recruiterId: form.recruiterId || null } : {}),
    };
    if (!managerChanged && !recruiterChanged) {
      const message =
        form.recruiterId && form.recruiterId === originalRecruiterId
          ? "This recruiter is already assigned to this opening."
          : canAssignManager &&
              form.hiringManagerId &&
              form.hiringManagerId === originalHiringManagerId
            ? "This hiring manager is already assigned to this opening."
            : "No team assignment changes were made.";
      setState({ loading: false, saving: false, error: message, success: "" });
      toast.error(message);
      return;
    }
    setState({ loading: false, saving: true, error: "", success: "" });
    try {
      await updateJob(job.id, payload);
      const manager = canAssignManager
        ? assignees.hiringManagers.find((person) => person.id === form.hiringManagerId) || null
        : job.hiringManager;
      const recruiter =
        assignees.recruiters.find((person) => person.id === form.recruiterId) || null;
      onSaved({ hiringManager: manager, recruiter });
      setState({
        loading: false,
        saving: false,
        error: "",
        success: "Opening team assignments saved.",
      });
      toast.success("Opening team updated.");
    } catch (error) {
      const message = getAssignmentErrorMessage(error);
      setState({ loading: false, saving: false, error: message, success: "" });
      toast.error(message);
    }
  };

  if (!canEditTeam) {
    return (
      <p className="mt-5 rounded-xl border border-white/[0.08] bg-[#080808] p-4 text-sm text-slate-300">
        Team assignments are read-only for your role.
      </p>
    );
  }

  return (
    <form
      onSubmit={save}
      className="mt-5 rounded-2xl border border-lime-300/10 bg-gradient-to-br from-[#151515] to-[#090909] p-4 shadow-lg shadow-black/40 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl border border-white/[0.07] bg-[#080808] p-2 text-lime-200 shadow-sm">
          <UsersRound className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-semibold text-white">Manage opening team</h3>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {canAssignManager
              ? "Assign a hiring manager and recruiter to this opening."
              : "You can assign a recruiter to your opening. The hiring manager stays assigned to you."}
          </p>
        </div>
      </div>
      {state.error && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-300/15 bg-rose-300/[0.07] p-3 text-sm text-rose-200"
        >
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.07] p-3 text-sm text-emerald-200"
        >
          {state.success}
        </p>
      )}
      {!state.error && state.loading && (
        <p role="status" className="mt-4 text-sm text-slate-400">
          Loading available team members…
        </p>
      )}
      {!state.loading && !state.error && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {canAssignManager && (
            <label className="text-sm font-semibold" htmlFor="team-hiring-manager">
              Hiring manager
              <select
                id="team-hiring-manager"
                name="hiringManagerId"
                value={form.hiringManagerId}
                onChange={change}
                className={fieldClass}
              >
                <option className="bg-[#080808] text-slate-100" value="">
                  No hiring manager assigned
                </option>
                {assignees.hiringManagers.map((person) => (
                  <option className="bg-[#080808] text-slate-100" key={person.id} value={person.id}>
                    {[person.firstName, person.lastName].filter(Boolean).join(" ") ||
                      person.username ||
                      person.email}{" "}
                    · {person.email} · ID: {person.id}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canAssignRecruiter && (
            <label className="text-sm font-semibold" htmlFor="team-recruiter">
              Recruiter
              <select
                id="team-recruiter"
                name="recruiterId"
                value={form.recruiterId}
                onChange={change}
                className={fieldClass}
              >
                <option className="bg-[#080808] text-slate-100" value="">
                  No recruiter assigned
                </option>
                {assignees.recruiters.map((person) => (
                  <option className="bg-[#080808] text-slate-100" key={person.id} value={person.id}>
                    {[person.firstName, person.lastName].filter(Boolean).join(" ") ||
                      person.username ||
                      person.email}{" "}
                    · {person.email} · ID: {person.id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      {canAssignRecruiter && (
        <button
          type="submit"
          disabled={state.loading || state.saving || Boolean(state.error)}
          className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-lime-300 px-4 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {state.saving ? "Saving…" : "Save team"}
        </button>
      )}
    </form>
  );
}
