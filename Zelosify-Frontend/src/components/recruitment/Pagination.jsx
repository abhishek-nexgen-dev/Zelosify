"use client";
import { Button } from "@/components/UI/shadcn/button";

export default function Pagination({ page, totalPages, onPageChange, disabled }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-300 dark:text-slate-400">
      <span>
        Page <strong className="text-slate-100 dark:text-slate-100">{page}</strong> of{" "}
        <strong className="text-slate-100 dark:text-slate-100">{totalPages}</strong>
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={disabled || page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={disabled || page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
