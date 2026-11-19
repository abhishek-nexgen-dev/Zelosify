"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, ShieldCheck, UserPlus, UsersRound, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import useAuth from "@/hooks/Auth/useAuth";
import { createTeamMember } from "@/features/admin/api";
import { canCreateTeamMember, getCreatableTeamRoles } from "@/features/auth/permissions";

const initial = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  department: "Talent Acquisition",
  password: "",
  role: "RECRUITER",
};
const inputClass =
  "mt-1.5 min-h-12 w-full rounded-xl border border-white/[0.08] bg-[#0b0b0b] px-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-lime-500 focus:bg-[#0b0b0b] focus:ring-4 focus:ring-lime-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-[#050505] dark:focus:bg-[#050505]";

export default function RecruiterCreatePage() {
  const { user } = useAuth();
  const router = useRouter();
  const creatableRoles = getCreatableTeamRoles(user);
  const canCreateMember = canCreateTeamMember(user);
  const canChooseRole = creatableRoles.length > 1;
  const [form, setForm] = useState(initial);
  const [state, setState] = useState({ saving: false, error: "" });
  const createdRoleName =
    form.role === "HIRING_MANAGER"
      ? "Hiring manager"
      : form.role === "IT_VENDOR"
        ? "IT vendor"
        : "Recruiter";

  const submit = async (event) => {
    event.preventDefault();
    setState({ saving: true, error: "" });
    try {
      await createTeamMember({
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        department: form.department.trim(),
      });
      toast.success(
        `${createdRoleName} account created. They can sign in with the password you set.`
      );
      router.push("/admin/recruiters");
    } catch (error) {
      const details = Array.isArray(error?.response?.data?.details)
        ? error.response.data.details
            .map((item) => item?.message)
            .filter(Boolean)
            .join(" ")
        : "";
      setState({
        saving: false,
        error:
          error?.response?.data?.message ||
          details ||
          error?.response?.data?.error ||
          (error?.response
            ? `${createdRoleName} account could not be created (HTTP ${error.response.status}).`
            : "Could not reach the server. Check your connection and try again."),
      });
    }
  };

  if (!canCreateMember) {
    return <main className="p-8">Team account creation is not available for this account.</main>;
  }

  const pageTitle = canChooseRole ? "Create team member" : "Create recruiter";

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-4 py-7 text-slate-50 dark:bg-[#050505] dark:text-white sm:px-7 sm:py-9 lg:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href="/admin/recruiters"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-lime-300 dark:text-slate-300 dark:hover:text-lime-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Recruiting team
        </Link>

        <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-6 text-white sm:p-8">
          <div
            className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <UserRoundCog className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-lime-100">
                Team management
              </span>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{pageTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-lime-100 sm:text-base">
                {canChooseRole
                  ? "Add a recruiter, hiring manager, or IT vendor. Access follows the selected role."
                  : "Add a recruiter to your organization."}
              </p>
            </div>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] shadow-sm dark:border-slate-800 dark:bg-[#0b0b0b]"
          >
            <div className="border-b border-white/[0.06] px-5 py-5 dark:border-slate-800 sm:px-7">
              <h2 className="font-semibold">
                {canChooseRole ? "Team member details" : "Recruiter details"}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Enter the team member’s details and a strong password they can use to sign in.
              </p>
            </div>
            <div className="space-y-5 px-5 py-6 sm:px-7">
              {state.error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
                >
                  {state.error}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="create-team-role" className="text-sm font-semibold">
                    Team role<span className="ml-1 text-rose-600">*</span>
                  </label>
                  {canChooseRole ? (
                    <select
                      id="create-team-role"
                      name="role"
                      value={form.role}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, role: event.target.value }))
                      }
                      disabled={state.saving}
                      className={inputClass}
                    >
                      {creatableRoles.map((role) => (
                        <option key={role} value={role}>
                          {role === "HIRING_MANAGER"
                            ? "Hiring manager"
                            : role === "IT_VENDOR"
                              ? "IT vendor"
                              : "Recruiter"}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className={`${inputClass} flex items-center`} aria-readonly="true">
                      Recruiter
                    </div>
                  )}
                  <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {canChooseRole
                      ? "The account receives default permissions for the selected role."
                      : "Choose a role with the organization administrator."}
                  </p>
                </div>
                <Field
                  label="First name"
                  name="firstName"
                  value={form.firstName}
                  onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
                  required
                  disabled={state.saving}
                  autoComplete="given-name"
                />
                <Field
                  label="Last name"
                  name="lastName"
                  value={form.lastName}
                  onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
                  required
                  disabled={state.saving}
                  autoComplete="family-name"
                />
                <Field
                  label="Username"
                  name="username"
                  value={form.username}
                  onChange={(value) => setForm((current) => ({ ...current, username: value }))}
                  required
                  disabled={state.saving}
                  minLength={3}
                  maxLength={50}
                  pattern="[A-Za-z0-9_-]+"
                  hint="Letters, numbers, underscores, and hyphens."
                  autoComplete="off"
                />
                <Field
                  label="Email address"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                  required
                  disabled={state.saving}
                  autoComplete="email"
                />
                <Field
                  label="Department"
                  name="department"
                  value={form.department}
                  onChange={(value) => setForm((current) => ({ ...current, department: value }))}
                  required
                  disabled={state.saving}
                />
                <Field
                  label="Initial password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                  required
                  disabled={state.saving}
                  minLength={12}
                  autoComplete="new-password"
                  hint="Use at least 12 characters and share it with the new team member securely."
                />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] px-5 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-7">
              <Link
                href="/admin/recruiters"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/[0.08] px-5 text-sm font-semibold text-slate-200 transition hover:bg-[#0b0b0b] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#171717]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={state.saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {state.saving ? "Creating account…" : pageTitle}
              </button>
            </div>
          </form>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-5 dark:border-slate-800 dark:bg-[#0b0b0b] sm:p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#141414] text-lime-300 dark:bg-lime-500/10 dark:text-lime-300">
                <UsersRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold">What happens next?</h2>
              <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300 dark:text-slate-400">
                <li className="flex gap-2.5">
                  <span className="mt-1 text-lime-300">01</span>
                  <span>The {createdRoleName.toLowerCase()} is added to your organization.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1 text-lime-300">02</span>
                  <span>The account receives the selected role and its default permissions.</span>
                </li>
                <li className="flex gap-2.5">
                  <span className="mt-1 text-lime-300">03</span>
                  <span>
                    They can sign in with the password you provide and set up their authenticator.
                  </span>
                </li>
              </ul>
            </section>
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100 sm:p-6">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Account security
              </div>
              <p className="mt-2 text-sm leading-6 opacity-80">
                Share the initial password privately through your organization’s secure channel.
              </p>
              <KeyRound className="mt-4 h-5 w-5 opacity-70" aria-hidden="true" />
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({ label, name, value, onChange, type = "text", hint, ...props }) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div>
      <label htmlFor={`create-recruiter-${name}`} className="text-sm font-semibold">
        {label}
        <span className="ml-1 text-rose-600">*</span>
      </label>
      <input
        id={`create-recruiter-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hintId}
        className={inputClass}
        {...props}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
