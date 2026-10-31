"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/** A labelled switch with a native checkbox underneath for accessibility. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
}: SwitchProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-surface-2 p-3.5 transition-colors hover:border-line-strong",
        disabled && "cursor-not-allowed opacity-55",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
        />
        <span
          aria-hidden="true"
          className={cn(
            "h-6 w-11 rounded-full border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
            checked
              ? "border-transparent bg-accent"
              : "border-line-strong bg-surface-3",
          )}
        >
          <span
            className={cn(
              "block size-5 rounded-full bg-white shadow-sm transition-transform",
              checked ? "translate-x-[1.35rem]" : "translate-x-0.5",
            )}
            style={{ marginTop: "0.125rem" }}
          />
        </span>
      </span>
    </label>
  );
}
