"use client";

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <div className="card max-w-md p-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Something went sideways</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          We could not load this screen. Your saved data is safe. Check your
          connection and try again.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[0.65rem] text-faint">Ref: {error.digest}</p>
        ) : null}
        <button type="button" className="btn btn-primary mt-5" onClick={reset}>
          <RefreshCw className="size-4" /> Try again
        </button>
      </div>
    </div>
  );
}
