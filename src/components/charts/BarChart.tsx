"use client";

import { useId } from "react";
import { cn } from "@/lib/ui";

export interface BarDatum {
  label: string;
  value: number;
  secondary?: number;
  hint?: string;
}

interface BarChartProps {
  bars: BarDatum[];
  hue?: number;
  max?: number;
  height?: number;
  formatValue?: (value: number) => string;
  secondaryLabel?: string;
  primaryLabel?: string;
  className?: string;
  emptyLabel?: string;
}

/**
 * Grouped vertical bars. Each group can show a "planned" bar (secondary) and a
 * "completed" bar (primary) so planned-versus-done stays legible.
 */
export function BarChart({
  bars,
  hue = 265,
  max,
  height = 210,
  formatValue = (value) => String(value),
  secondaryLabel = "Planned",
  primaryLabel = "Completed",
  className,
  emptyLabel = "Nothing scheduled in this range.",
}: BarChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const width = 720;
  const padX = 34;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const ceiling = Math.max(
    max ?? 0,
    ...bars.flatMap((bar) => [bar.value, bar.secondary ?? 0]),
    1,
  );
  const slot = innerW / Math.max(1, bars.length);
  const barWidth = Math.min(30, slot * 0.28);
  const hasSecondary = bars.some((bar) => bar.secondary !== undefined);
  const labelEvery = Math.max(1, Math.ceil(bars.length / 8));
  const colour = `oklch(0.68 0.2 ${hue})`;

  if (bars.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-line-strong text-sm text-muted",
          className,
        )}
        style={{ height }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <figure className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label={`Bar chart comparing ${primaryLabel}${hasSecondary ? ` and ${secondaryLabel}` : ""}.`}
      >
        <defs>
          <linearGradient id={`bar-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colour} />
            <stop offset="100%" stopColor={`oklch(0.62 0.19 ${(hue + 35) % 360})`} />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((fraction) => {
          const y = padY + innerH - fraction * innerH;
          return (
            <g key={fraction}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--grid-line)"
                strokeDasharray={fraction === 0 ? undefined : "3 5"}
              />
              <text
                x={padX - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-[var(--faint)] text-[10px]"
              >
                {formatValue(ceiling * fraction)}
              </text>
            </g>
          );
        })}

        {bars.map((bar, index) => {
          const centre = padX + slot * index + slot / 2;
          const primaryHeight = (bar.value / ceiling) * innerH;
          const secondaryHeight = ((bar.secondary ?? 0) / ceiling) * innerH;
          const primaryX = hasSecondary ? centre : centre - barWidth / 2;
          const secondaryX = centre - barWidth - 1;

          return (
            <g key={`${bar.label}-${index}`}>
              {hasSecondary ? (
                <rect
                  x={secondaryX}
                  y={padY + innerH - secondaryHeight}
                  width={barWidth}
                  height={Math.max(secondaryHeight, 1)}
                  rx={4}
                  fill="var(--surface-3)"
                >
                  <title>{`${bar.label} — ${secondaryLabel}: ${formatValue(bar.secondary ?? 0)}`}</title>
                </rect>
              ) : null}
              <rect
                x={primaryX}
                y={padY + innerH - primaryHeight}
                width={barWidth}
                height={Math.max(primaryHeight, 1)}
                rx={4}
                fill={`url(#bar-${gradientId})`}
              >
                <title>{`${bar.label} — ${primaryLabel}: ${formatValue(bar.value)}`}</title>
              </rect>
              {index % labelEvery === 0 ? (
                <text
                  x={centre}
                  y={height - 3}
                  textAnchor="middle"
                  className="fill-[var(--faint)] text-[10px]"
                >
                  {bar.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      {hasSecondary ? (
        <figcaption className="mt-2 flex items-center justify-center gap-4 text-[0.68rem] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: "var(--surface-3)" }} />
            {secondaryLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: colour }} />
            {primaryLabel}
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}
