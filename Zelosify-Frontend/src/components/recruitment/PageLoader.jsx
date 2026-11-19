import { LoaderCircle } from "lucide-react";

export default function PageLoader({ label = "Loading page…", className = "" }) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={`flex min-h-[45vh] flex-col items-center justify-center gap-4 px-4 py-10 text-center ${className}`}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lime-300/15 bg-lime-400/[0.08] text-lime-200 shadow-lg shadow-lime-950/20">
        <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden="true" />
      </span>
      <span className="text-sm font-semibold text-slate-200 dark:text-slate-200">{label}</span>
    </section>
  );
}
