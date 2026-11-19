"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, KeyRound } from "lucide-react";
import axiosInstance from "@/utils/Axios/AxiosInstance";

const fieldClass =
  "mt-1.5 min-h-12 w-full rounded-xl border border-white/10 bg-[#080a0d] px-4 text-sm text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-slate-500 focus:border-lime-300/70 focus:ring-4 focus:ring-lime-400/10";

const blankForm = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  phoneNumber: "",
};

const steps = ["About you", "Your account", "Secure it"];
const stepCopy = [
  {
    title: "Start with your story.",
    description: "A few details help employers get to know the person behind the profile.",
  },
  {
    title: "Make it yours.",
    description: "Choose your sign-in details so you can return to your search anytime.",
  },
  {
    title: "Keep your profile secure.",
    description: "Set a strong password, then you’re ready to find your next opportunity.",
  },
];

const routeForRole = {
  CANDIDATE: "/candidate/dashboard",
  ADMIN: "/admin/recruiters",
  RECRUITER: "/recruiter/jobs",
  HIRING_MANAGER: "/hiring-manager/openings",
  IT_VENDOR: "/vendor/openings",
};

export default function Register() {
  const [form, setForm] = useState(blankForm);
  const [step, setStep] = useState(1);
  const [state, setState] = useState({
    saving: false,
    verifying: false,
    error: "",
    totpError: "",
    qrCode: "",
    qrLoading: false,
    qrError: "",
    totp: "",
    totpSessionReady: false,
    setupPending: false,
  });

  const change = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const loadSetupQr = async () => {
    setState((current) => ({ ...current, qrLoading: true, qrError: "" }));
    try {
      const { data } = await axiosInstance.get("/auth/totp/setup/qr");
      setState((current) => ({
        ...current,
        qrCode: data.qrCode || "",
        qrLoading: false,
        qrError: "",
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        qrCode: "",
        qrLoading: false,
        qrError: error?.response?.data?.message || "The QR code could not be loaded. Try again.",
      }));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, error: "" }));

    if (form.password !== form.confirmPassword) {
      setState((current) => ({ ...current, error: "Passwords do not match." }));
      return;
    }

    setState((current) => ({ ...current, saving: true }));
    try {
      const { data } = await axiosInstance.post("/auth/register", {
        username: form.username,
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber || undefined,
      });
      setState({
        saving: false,
        verifying: false,
        error: "",
        totpError: "",
        qrCode: "",
        qrLoading: false,
        qrError: "",
        totp: "",
        totpSessionReady: Boolean(data.totpSessionReady),
        setupPending: true,
      });
      if (data.totpSessionReady) await loadSetupQr();
    } catch (error) {
      setState({
        saving: false,
        verifying: false,
        error:
          error?.response?.data?.message ||
          error?.response?.data?.details?.[0]?.message ||
          "We could not create your account. Please check the fields and try again.",
        qrCode: "",
        totp: "",
        totpError: "",
        qrLoading: false,
        qrError: "",
        totpSessionReady: false,
        setupPending: false,
      });
    }
  };

  const verifySignupTotp = async (event) => {
    event.preventDefault();
    setState((current) => ({ ...current, verifying: true, totpError: "" }));
    try {
      const { data } = await axiosInstance.post("/auth/verify-totp", { totp: state.totp });
      const destination = routeForRole[data.user?.role] || "/login";
      window.location.replace(destination);
    } catch (error) {
      setState((current) => ({
        ...current,
        verifying: false,
        totpError:
          error?.response?.data?.message ||
          "We could not verify that code. Enter the current code from your authenticator app.",
      }));
    }
  };

  const handleStepSubmit = (event) => {
    if (step === steps.length) {
      submit(event);
      return;
    }

    event.preventDefault();
    if (event.currentTarget.reportValidity()) {
      setState((current) => ({ ...current, error: "" }));
      setStep((current) => current + 1);
    }
  };

  return (
    <section className="flex min-h-full w-full items-center justify-center overflow-visible">
      {state.setupPending ? (
        <div
          className="mx-auto w-full max-w-lg rounded-[1.75rem] border border-white/[0.09] bg-[#0e1116]/95 px-6 py-8 text-center shadow-[0_30px_100px_-35px_rgba(0,0,0,0.9)] sm:px-8 sm:py-10"
          aria-live="polite"
        >
          <span className="mx-auto inline-flex rounded-2xl border border-cyan-200/10 bg-cyan-300/[0.08] p-3 text-cyan-200">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            Set up two-factor sign-in
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Scan this one-time QR code in Google Authenticator, then enter its current six-digit
            code to finish setup and sign in.
          </p>
          {state.qrCode ? (
            <img
              src={state.qrCode}
              alt="Authenticator setup QR code"
              className="mx-auto mt-6 h-48 w-48 rounded-xl border border-white/10 bg-[#0b0b0b] p-2"
            />
          ) : (
            <div
              className="mx-auto mt-6 flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-[#080a0d] p-4 text-center text-sm text-slate-400"
              role="status"
            >
              {state.qrLoading
                ? "Generating your QR code…"
                : state.qrError || "Your QR code is not loaded yet."}
              {state.totpSessionReady && !state.qrLoading && (
                <button
                  type="button"
                  onClick={loadSetupQr}
                  className="font-semibold text-lime-300 hover:text-lime-200 dark:text-lime-300"
                >
                  Generate QR
                </button>
              )}
            </div>
          )}
          <div className="mt-5 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.06] p-4 text-left text-xs leading-5 text-cyan-100/80">
            <KeyRound className="mr-1 inline h-4 w-4" />
            Keep your authenticator available. This QR contains your private setup key.
          </div>
          {state.totpSessionReady ? (
            <form onSubmit={verifySignupTotp} className="mx-auto mt-6 max-w-sm text-left">
              <label
                htmlFor="signup-totp"
                className="block text-left text-sm font-semibold text-slate-200"
              >
                2FA code
              </label>
              <input
                id="signup-totp"
                name="totp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                placeholder="Enter the 6-digit code"
                value={state.totp}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    totp: event.target.value.replace(/\D/g, "").slice(0, 6),
                  }))
                }
                required
                aria-invalid={Boolean(state.totpError)}
                aria-describedby={state.totpError ? "signup-totp-error" : undefined}
                className={`${fieldClass} mt-2 text-center text-lg tracking-[0.35em]`}
              />
              {state.totpError && (
                <p id="signup-totp-error" role="alert" className="mt-2 text-sm text-rose-300">
                  {state.totpError}
                </p>
              )}
              <button
                type="submit"
                disabled={state.verifying || state.totp.length !== 6}
                className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-lime-300 px-6 text-sm font-bold text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
              >
                {state.verifying ? "Verifying…" : "Verify and sign in"}
              </button>
            </form>
          ) : (
            <p className="mx-auto mt-6 max-w-sm rounded-xl border border-amber-300/15 bg-amber-300/[0.07] p-3 text-left text-sm text-amber-100/90">
              Your account was created, but a setup session could not be started. Continue to sign
              in to set up your authenticator.
            </p>
          )}
          <Link
            href="/login"
            className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 px-4 text-sm font-semibold text-cyan-200 transition hover:text-white"
          >
            Continue to sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-xl rounded-[1.75rem] border border-white/[0.09] bg-[#0e1116]/95 px-5 py-6 shadow-[0_30px_100px_-35px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:px-8 sm:py-8 lg:px-9">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
                Candidate account
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {stepCopy[step - 1].title}
              </h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                {stepCopy[step - 1].description}
              </p>
            </div>
            <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-300 sm:flex">
              0{step}
            </span>
          </div>

          <div className="mt-8" aria-label={`Step ${step} of ${steps.length}`}>
            <div className="flex items-center">
              {steps.map((label, index) => {
                const number = index + 1;
                const complete = number < step;
                const active = number === step;

                return (
                  <div key={label} className="flex flex-1 items-center last:flex-none">
                    <div className="flex min-w-0 flex-col items-center gap-2">
                      <span
                        aria-current={active ? "step" : undefined}
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition ${
                          complete || active
                            ? "bg-cyan-300 text-slate-50 shadow-lg shadow-cyan-950/20"
                            : "border border-white/10 bg-[#090b0f] text-slate-500"
                        }`}
                      >
                        {complete ? <Check className="h-4 w-4" /> : number}
                      </span>
                      <span
                        className={`whitespace-nowrap text-[11px] font-medium sm:text-xs ${
                          active ? "text-cyan-100" : "text-slate-500"
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {number < steps.length && (
                      <span
                        aria-hidden="true"
                        className={`mx-2 mb-5 h-px flex-1 sm:mx-4 ${
                          complete ? "bg-cyan-300/70" : "bg-white/10"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {state.error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-rose-300/15 bg-rose-300/[0.07] p-3.5 text-sm text-rose-200"
            >
              {state.error}
            </div>
          )}

          <form onSubmit={handleStepSubmit} className="mt-7">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="firstName"
                    label="First name"
                    placeholder="e.g. Alex"
                    value={form.firstName}
                    onChange={change}
                    autoComplete="given-name"
                    required
                  />
                  <Field
                    id="lastName"
                    label="Last name"
                    placeholder="e.g. Morgan"
                    value={form.lastName}
                    onChange={change}
                    autoComplete="family-name"
                    required
                  />
                </div>
                <Field
                  id="phoneNumber"
                  label="Phone number"
                  placeholder="Optional"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={change}
                  autoComplete="tel"
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Field
                  id="username"
                  label="Username"
                  placeholder="Choose a username"
                  value={form.username}
                  onChange={change}
                  autoComplete="username"
                  required
                  minLength={3}
                />
                <Field
                  id="email"
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={change}
                  autoComplete="email"
                  required
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Field
                  id="password"
                  label="Password (12 characters minimum)"
                  type="password"
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={change}
                  autoComplete="new-password"
                  required
                  minLength={12}
                />
                <Field
                  id="confirmPassword"
                  label="Confirm password"
                  type="password"
                  placeholder="Enter your password again"
                  value={form.confirmPassword}
                  onChange={change}
                  autoComplete="new-password"
                  required
                  minLength={12}
                />
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Candidate signup creates a candidate profile only. Recruiter, manager, and
                  administrator access is assigned separately.
                </p>
              </div>
            )}

            <div className="mt-7 flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.07]"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
              )}
              <button
                type="submit"
                disabled={state.saving}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 text-sm font-bold text-black transition hover:-translate-y-0.5 hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {step < steps.length ? (
                  <>
                    Next step <ArrowRight className="h-4 w-4" />
                  </>
                ) : state.saving ? (
                  "Creating account…"
                ) : (
                  <>
                    Submit <ArrowUpRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <p className="mt-6 border-t border-white/[0.08] pt-5 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-cyan-200 hover:text-white">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </section>
  );
}

function Field({ id, label, type = "text", value, onChange, placeholder, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={fieldClass}
        {...props}
      />
    </div>
  );
}
