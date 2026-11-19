"use client";
import { Button } from "@/components/UI/shadcn/button";

export function ErrorState({ title, message, onRetry }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
      <p className="font-medium">{title}</p>
      {message ? <p className="mt-1">{message}</p> : null}
      {onRetry ? (
        <Button className="mt-3" variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="p-10 text-center">
      <p className="text-base font-medium text-slate-100 dark:text-slate-100">{title}</p>
      {description ? (
        <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
