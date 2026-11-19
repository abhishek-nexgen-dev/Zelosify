"use client";

const styles = {
  Recommended:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  Borderline:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  "Not Recommended":
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  Processing: "bg-lime-400/10 text-lime-200 border-lime-300/15",
  Failed:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  Pending:
    "bg-[#111111] text-slate-200 border-white/[0.08] dark:bg-[#171717] dark:text-slate-300 dark:border-slate-700",
  SUBMITTED:
    "bg-[#111111] text-slate-200 border-white/[0.08] dark:bg-[#171717] dark:text-slate-300 dark:border-slate-700",
  SHORTLISTED:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  REJECTED:
    "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

export default function StatusBadge({ label }) {
  const cls = styles[label] || styles.Pending;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  );
}
