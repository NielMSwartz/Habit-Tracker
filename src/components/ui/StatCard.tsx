import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  hue?: number;
  accent?: boolean;
  className?: string;
}

/** A compact metric tile used across the dashboard and analytics pages. */
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  hue = 265,
  accent = false,
  className,
}: StatCardProps) {
  const colour = `oklch(0.66 0.2 ${((hue % 360) + 360) % 360})`;

  return (
    <div
      className={cn(
        "card relative overflow-hidden p-4 sm:p-5",
        accent && "card-glow",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl"
        style={{ background: colour }}
        aria-hidden="true"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {value}
          </p>
          {detail ? (
            <div className="mt-1 text-xs leading-relaxed text-muted">{detail}</div>
          ) : null}
        </div>
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{
            background: `oklch(0.68 0.2 ${hue} / 0.13)`,
            color: colour,
            border: `1px solid oklch(0.68 0.2 ${hue} / 0.22)`,
          }}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
