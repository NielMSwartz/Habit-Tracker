"use client";

import { useId } from "react";
import { cn } from "@/lib/ui";

export interface TrendPoint {
  label: string;
  value: number;
  hint?: string;
}

interface TrendChartProps {
  points: TrendPoint[];
  hue?: number;
  max?: number;
  height?: number;
  formatValue?: (value: number) => string;
  emptyLabel?: string;
  className?: string;
  showDots?: boolean;
}

/**
 * A dependency-free, responsive SVG trend chart. It is deliberately small:
 * crisp area fills, a few grid lines and native title tooltips keep it fast on
 * low-end phones and easy to theme.
 */
export function TrendChart({
  points,
  hue = 265,
  max,
  height = 210,
  formatValue = (value) => String(value),
  emptyLabel = "No data in this range yet.",
  className,
  showDots = true,
}: TrendChartProps) {
  const gradientId = useId().replace(/:/g, "");
  const width = 720;
  const padX = 34;
  const padY = 22;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const ceiling = Math.max(max ?? 0, ...points.map((point) => point.value), 1);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    ...point,
    x: padX + (points.length > 1 ? index * stepX : innerW / 2),
    y: padY + innerH - (point.value / ceiling) * innerH,
  }));

  const linePath = coords
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = coords[index - 1];
      const midX = (previous.x + point.x) / 2;
      return `C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${padY + innerH} L ${coords[0].x} ${padY + innerH} Z`
      : "";

  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const colour = `oklch(0.7 0.21 ${hue})`;
  const summary = points
    .map((point) => `${point.label}: ${formatValue(point.value)}`)
    .join(", ");

  if (points.length === 0) {
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
        aria-label={`Trend chart. ${summary}`}
      >
        <defs>
          <linearGradient id={`fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colour} stopOpacity="0.32" />
            <stop offset="70%" stopColor={colour} stopOpacity="0.06" />
            <stop offset="100%" stopColor={colour} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = padY + innerH - fraction * innerH;
          return (
            <g key={fraction}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="var(--grid-line)"
                strokeWidth="1"
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

        {areaPath ? <path d={areaPath} fill={`url(#fill-${gradientId})`} /> : null}
        <path
          d={linePath}
          fill="none"
          stroke={colour}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: `drop-shadow(0 3px 6px oklch(0.7 0.21 ${hue} / 0.35))` }}
        />

        {coords.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            {showDots && (points.length <= 45 || index === coords.length - 1) ? (
              <circle
                cx={point.x}
                cy={point.y}
                r={index === coords.length - 1 ? 4 : 2.6}
                fill="var(--surface-solid)"
                stroke={colour}
                strokeWidth="2"
              >
                <title>{`${point.label}: ${formatValue(point.value)}`}</title>
              </circle>
            ) : (
              <circle cx={point.x} cy={point.y} r="8" fill="transparent">
                <title>{`${point.label}: ${formatValue(point.value)}`}</title>
              </circle>
            )}
            {index % labelEvery === 0 || index === coords.length - 1 ? (
              <text
                x={point.x}
                y={height - 4}
                textAnchor={index === 0 ? "start" : index === coords.length - 1 ? "end" : "middle"}
                className="fill-[var(--faint)] text-[10px]"
              >
                {point.label}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}
