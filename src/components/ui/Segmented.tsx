"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md";
}

/**
 * An accessible segmented control. It renders real buttons with
 * `aria-pressed`, which keeps keyboard and screen-reader behaviour simple.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  size = "md",
}: SegmentedProps<T>) {
  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1",
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-semibold transition-all",
              size === "sm" ? "px-2.5 py-1 text-[0.7rem]" : "px-3 py-1.5 text-xs",
              active
                ? "bg-surface-solid text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {option.icon ? <option.icon className="size-3.5" /> : null}
            {option.label}
            {option.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[0.6rem] tabular-nums",
                  active ? "bg-accent-soft text-accent" : "bg-surface-3 text-muted",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
