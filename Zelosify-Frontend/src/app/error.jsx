"use client";

import Link from "next/link";

export default function ErrorPage({ reset }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0b0b] px-4 text-slate-100 dark:bg-[#050505] dark:text-slate-100">
      <section className="max-w-lg text-center" aria-labelledby="error-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-lime-300">
          Something went wrong
        </p>
        <h1 id="error-title" className="mt-3 text-3xl font-bold tracking-tight">
          This page couldn’t load
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300 dark:text-slate-300">
          Try loading the page again. If the problem continues, return to the home page and try
          again later.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="min-h-11 rounded-lg bg-lime-300 px-4 text-sm font-semibold text-black hover:bg-lime-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-4 text-sm font-semibold hover:bg-[#0b0b0b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-200 dark:border-slate-700 dark:hover:bg-[#0b0b0b]"
          >
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
