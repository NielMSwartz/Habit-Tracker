"use client";

import { useMemo } from "react";
import { formatDateLabel } from "@/lib/dates";
import type { HeatmapCellDTO } from "@/lib/types";
import { cn } from "@/lib/ui";

interface HeatmapProps {
  cells: HeatmapCellDTO[];
  hue?: number;
  weekStartsOn?: number;
  onSelect?: (cell: HeatmapCellDTO) => void;
  selectedDate?: string | null;
  compact?: boolean;
  showLegend?: boolean;
  className?: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function cellColour(cell: HeatmapCellDTO | undefined, hue: number): string {
  if (!cell || cell.status === "none") return "var(--surface-2)";
  if (cell.status === "complete") return `oklch(0.66 0.21 ${hue})`;
  if (cell.status === "partial") {
    return `oklch(0.66 0.21 ${hue} / ${0.32 + cell.rate * 0.35})`;
  }
  return "var(--surface-3)";
}

function cellRing(cell: HeatmapCellDTO | undefined): string {
  if (!cell || cell.status === "none") return "transparent";
  if (cell.status === "missed") return "color-mix(in oklch, var(--danger) 30%, transparent)";
  return "transparent";
}

/**
 * A GitHub-style contribution grid. Cells are grouped into calendar weeks so
 * the shape stays stable even when a range starts mid-week.
 */
export function Heatmap({
  cells,
  hue = 265,
  weekStartsOn = 1,
  onSelect,
  selectedDate,
  compact = false,
  showLegend = true,
  className,
}: HeatmapProps) {
  const { weeks, monthTicks } = useMemo(() => {
    const byDate = new Map(cells.map((cell) => [cell.date, cell]));
    const sorted = [...cells].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    if (!first) return { weeks: [] as (HeatmapCellDTO | undefined)[][], monthTicks: [] as { index: number; label: string }[] };

    const startOffset =
      (new Date(`${first.date}T00:00:00Z`).getUTCDay() - weekStartsOn + 7) % 7;
    const padded: (HeatmapCellDTO | undefined)[] = [
      ...Array.from({ length: startOffset }, () => undefined),
      ...sorted.map((cell) => byDate.get(cell.date)),
    ];
    while (padded.length % 7 !== 0) padded.push(undefined);

    const grouped: (HeatmapCellDTO | undefined)[][] = [];
    for (let index = 0; index < padded.length; index += 7) {
      grouped.push(padded.slice(index, index + 7));
    }

    const ticks: { index: number; label: string }[] = [];
    let lastMonth = "";
    grouped.forEach((week, index) => {
      const firstDay = week.find(Boolean);
      if (!firstDay) return;
      const month = firstDay.date.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        ticks.push({
          index,
          label: new Date(`${firstDay.date}T00:00:00Z`).toLocaleDateString("en-GB", {
            month: "short",
            timeZone: "UTC",
          }),
        });
      }
    });

    return { weeks: grouped, monthTicks: ticks };
  }, [cells, weekStartsOn]);

  if (weeks.length === 0) return null;

  const weekdays = Array.from({ length: 7 }, (_, index) => (weekStartsOn + index) % 7);
  const size = compact ? 10 : 13;
  const gap = compact ? 3 : 4;

  return (
    <div className={cn("w-full", className)}>
      <div className="hide-scrollbar overflow-x-auto pb-1">
        <div className="inline-flex min-w-full flex-col gap-1">
          <div className="ml-7 flex" style={{ gap }}>
            {weeks.map((_, index) => {
              const tick = monthTicks.find((entry) => entry.index === index);
              return (
                <span
                  key={index}
                  className="shrink-0 text-[0.58rem] font-semibold uppercase tracking-wide text-faint"
                  style={{ width: size }}
                >
                  {tick ? tick.label : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-1">
            <div className="flex w-6 shrink-0 flex-col justify-between" style={{ gap }}>
              {weekdays.map((day, index) => (
                <span
                  key={day}
                  className="flex items-center text-[0.55rem] font-medium text-faint"
                  style={{ height: size }}
                >
                  {index % 2 === 1 ? WEEKDAY_LABELS[day].slice(0, 3) : ""}
                </span>
              ))}
            </div>
            <div className="flex" style={{ gap }}>
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex shrink-0 flex-col" style={{ gap }}>
                  {week.map((cell, dayIndex) => {
                    const label = cell
                      ? `${formatDateLabel(cell.date, { short: true })} — ${cell.completed}/${cell.scheduled} complete`
                      : "";
                    const content = (
                      <span
                        aria-hidden="true"
                        className="block rounded-[3px] transition-transform"
                        style={{
                          width: size,
                          height: size,
                          background: cellColour(cell, hue),
                          boxShadow: cell?.status === "missed"
                            ? `inset 0 0 0 1px ${cellRing(cell)}`
                            : undefined,
                        }}
                      />
                    );

                    if (!cell) {
                      return (
                        <span key={dayIndex} style={{ width: size, height: size }}>
                          {content}
                        </span>
                      );
                    }

                    if (!onSelect) {
                      return (
                        <span
                          key={dayIndex}
                          title={label}
                          className="block rounded-[3px] transition-transform hover:scale-125"
                          style={{ width: size, height: size }}
                        >
                          {content}
                        </span>
                      );
                    }

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        onClick={() => onSelect(cell)}
                        title={label}
                        aria-label={label}
                        aria-pressed={selectedDate === cell.date}
                        className={cn(
                          "rounded-[3px] transition-transform hover:scale-125 focus-visible:scale-125",
                          selectedDate === cell.date && "ring-2 ring-accent ring-offset-1 ring-offset-[var(--bg)]",
                        )}
                        style={{ width: size, height: size }}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLegend ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[0.65rem] text-muted">
          <span>{cells.filter((cell) => cell.scheduled > 0).length} scheduled days</span>
          <span className="flex items-center gap-1.5">
            <span>Less</span>
            {[0, 0.25, 0.55, 0.8, 1].map((opacity) => (
              <span
                key={opacity}
                className="size-3 rounded-[3px]"
                style={{
                  background:
                    opacity === 0
                      ? "var(--surface-2)"
                      : `oklch(0.66 0.21 ${hue} / ${opacity})`,
                }}
              />
            ))}
            <span>More</span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
