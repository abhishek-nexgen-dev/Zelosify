"use client";

import Link from "next/link";

export default function SetupTOTP() {
  return (
    <main className="mx-auto max-w-lg rounded-xl border bg-[#0b0b0b] p-8 text-slate-100 dark:bg-[#0b0b0b] dark:text-slate-100">
      <h1 className="text-2xl font-semibold">Complete authenticator setup</h1>
      <p className="mt-4">
        Sign in with your password to continue setup. If your account is still pending, the sign-in
        page will retrieve your QR code and let you verify a six-digit code from Google
        Authenticator.
      </p>
      <p className="mt-3 text-sm">
        Signup does not include the QR code in its response. Enrolled accounts must enter their
        current code; password-only sessions cannot reveal an active TOTP secret. Contact your
        organization’s administrator if you need authenticator recovery.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex rounded-lg bg-lime-300 px-4 py-3 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Continue to sign in
      </Link>
    </main>
  );
}
