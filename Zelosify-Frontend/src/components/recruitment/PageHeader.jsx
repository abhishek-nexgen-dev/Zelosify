"use client";

export default function PageHeader({ title, description, action, back }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {back ? <div className="mb-2">{back}</div> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 dark:text-slate-100 sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
