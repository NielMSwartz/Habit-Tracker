import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

/** A friendly, reusable empty state with an optional call to action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8" : "px-5 py-12",
        className,
      )}
    >
      <span className="relative mb-4 grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <span
          className="absolute inset-0 rounded-2xl opacity-40 blur-lg"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        />
        <Icon className="relative size-6" />
      </span>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
