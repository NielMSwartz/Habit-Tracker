"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Flame,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { BarChart } from "@/components/charts/BarChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { TrendChart } from "@/components/charts/TrendChart";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { Segmented } from "@/components/ui/Segmented";
import { StatCard } from "@/components/ui/StatCard";
import { PageSkeleton, Spinner } from "@/components/ui/Spinner";
import { apiFetch, ApiError } from "@/lib/client/api";
import { addDays, formatDateLabel, formatLongDate, todayKey } from "@/lib/dates";
import type { HeatmapCellDTO, StatsDTO } from "@/lib/types";
import { durationLabel, hueColor, occurrenceLabel, percent } from "@/lib/ui";

const PRESETS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "1 year" },
] as const;

type PresetDays = (typeof PRESETS)[number]["days"] | 0;

export function AnalyticsView() {
  const { data, user, loading, revision } = useApp();
  const today = todayKey(user.timezone);
  const [preset, setPreset] = useState<PresetDays>(30);
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [habitId, setHabitId] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCellDTO | null>(null);

  const applyPreset = (days: PresetDays) => {
    setPreset(days);
    setFrom(addDays(to, -(days - 1)));
  };

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to });
      if (habitId !== "all") params.set("habitId", habitId);
      if (categoryId !== "all") params.set("categoryId", categoryId);
      const result = await apiFetch<StatsDTO>(`/api/stats?${params.toString()}`);
      setStats(result);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not load analytics. Check your connection and try again.",
      );
    } finally {
      setFetching(false);
    }
  }, [from, to, habitId, categoryId]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  const activeStats = stats;

  const trend = useMemo(
    () =>
      (activeStats?.daily ?? []).map((day) => ({
        label: formatDateLabel(day.date, { short: true }),
        value: day.rate,
      })),
    [activeStats],
  );

  const focusTrend = useMemo(
    () =>
      (activeStats?.daily ?? []).map((day) => ({
        label: formatDateLabel(day.date, { short: true }),
        value: day.timerMinutes,
      })),
    [activeStats],
  );

  const plannedVsDone = useMemo(() => {
    const series = period === "weekly" ? activeStats?.weekly : activeStats?.monthly;
    return (series ?? [])
      .slice(-14)
      .map((point) => ({
        label:
          period === "weekly"
            ? point.label.replace("Week of ", "")
            : point.label.split(" ")[0].slice(0, 3),
        value: point.completed,
        secondary: point.scheduled,
      }));
  }, [activeStats, period]);

  const selectedHabits = useMemo(() => {
    if (!activeStats) return [];
    const source = activeStats.habits.filter((habit) => habit.scheduled > 0);
    return [...source].sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  }, [activeStats]);

  if (!data && loading) return <PageSkeleton />;

  const summary = activeStats?.summary;

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Patterns, not pressure"
        title="Analytics"
        description="Honest rates, real focus time and streaks that only count days you actually planned."
        actions={
          <span className="chip">
            <CalendarRange className="size-3.5" />
            {formatDateLabel(from, { short: true })} – {formatDateLabel(to, { short: true })}
          </span>
        }
      />

      <div className="card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={String(preset)}
            onChange={(value) => applyPreset(Number(value) as PresetDays)}
            options={PRESETS.map((item) => ({
              value: String(item.days),
              label: item.label,
            }))}
            ariaLabel="Analytics range preset"
            size="sm"
          />
          <span className="hidden text-[0.65rem] text-faint sm:inline">or</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              className="input !min-h-9 !w-auto !py-1.5 text-xs"
              value={from}
              max={to}
              aria-label="From date"
              onChange={(event) => {
                if (!event.target.value) return;
                setFrom(event.target.value);
                setPreset(0);
              }}
            />
            <span className="text-[0.65rem] text-faint">to</span>
            <input
              type="date"
              className="input !min-h-9 !w-auto !py-1.5 text-xs"
              value={to}
              min={from}
              max={today}
              aria-label="To date"
              onChange={(event) => {
                if (!event.target.value) return;
                setTo(event.target.value);
                setPreset(0);
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select !min-h-9 !w-auto !py-1.5 text-xs"
            aria-label="Filter by habit"
            value={habitId}
            onChange={(event) => {
              setHabitId(event.target.value);
              if (event.target.value !== "all") setCategoryId("all");
            }}
          >
            <option value="all">All habits</option>
            {(data?.habits ?? []).map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.icon ? `${habit.icon} ` : ""}
                {habit.name}
              </option>
            ))}
          </select>
          <select
            className="select !min-h-9 !w-auto !py-1.5 text-xs"
            aria-label="Filter by category"
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              if (event.target.value !== "all") setHabitId("all");
            }}
          >
            <option value="all">All categories</option>
            {(data?.categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {fetching ? <Spinner size={14} className="text-accent" /> : null}
          {habitId !== "all" || categoryId !== "all" ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setHabitId("all");
                setCategoryId("all");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-[color-mix(in_oklch,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--warning)]"
        >
          {error}
          <button type="button" className="font-bold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {!activeStats ? (
        <div className="card p-8">
          <div className="flex justify-center">
            <Spinner size={26} className="text-accent" />
          </div>
        </div>
      ) : activeStats.summary.scheduled === 0 ? (
        <div className="card">
          <EmptyState
            icon={BarChart3}
            title="No scheduled history yet"
            description="Once you have scheduled habits in this range, your rates, streaks and heatmap will grow here."
          />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Completion rate"
              value={percent(summary?.rate ?? 0)}
              detail={`${summary?.completed ?? 0} of ${summary?.scheduled ?? 0} planned`}
              icon={Target}
              hue={user.accentHue}
              accent
            />
            <StatCard
              label="Current streak"
              value={`${summary?.currentStreak ?? 0} days`}
              detail={`Longest ${summary?.longestStreak ?? 0} days`}
              icon={Flame}
              hue={28}
            />
            <StatCard
              label="Focus time"
              value={durationLabel(summary?.timerMinutes ?? 0)}
              detail={`${summary?.partial ?? 0} partially done`}
              icon={Clock3}
              hue={190}
            />
            <StatCard
              label="Perfect days"
              value={`${summary?.perfectDays ?? 0}`}
              detail={`${summary?.activeDays ?? 0} active days`}
              icon={Award}
              hue={340}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <section className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-ink">Completion rate</h2>
                  <p className="text-xs text-muted">
                    Share of scheduled habits finished each day
                  </p>
                </div>
                <span className="chip">
                  <TrendingUp className="size-3 text-[var(--success)]" />
                  {percent(summary?.rate ?? 0)} overall
                </span>
              </div>
              <div className="mt-4">
                <TrendChart
                  points={trend}
                  hue={user.accentHue}
                  height={230}
                  max={1}
                  formatValue={(value) => percent(value)}
                />
              </div>
            </section>

            <section className="card p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-ink">Planned vs completed</h2>
                  <p className="text-xs text-muted">Compare what you planned with what happened</p>
                </div>
                <Segmented
                  value={period}
                  onChange={setPeriod}
                  options={[
                    { value: "weekly", label: "Weekly" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                  ariaLabel="Aggregation period"
                  size="sm"
                />
              </div>
              <div className="mt-4">
                <BarChart
                  bars={plannedVsDone}
                  hue={user.accentHue}
                  height={230}
                  primaryLabel="Completed"
                  secondaryLabel="Planned"
                />
              </div>
            </section>
          </div>

          <section className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-ink">The year in colour</h2>
                <p className="text-xs text-muted">
                  Click a day to see what happened. Bright means complete, soft means partial.
                </p>
              </div>
              <span className="chip">
                <Activity className="size-3" /> {summary?.totalHabits ?? 0} habits
              </span>
            </div>
            <div className="mt-4">
              <Heatmap
                cells={activeStats.heatmap}
                hue={user.accentHue}
                weekStartsOn={user.weekStartsOn}
                selectedDate={selectedCell?.date}
                onSelect={(cell) =>
                  setSelectedCell((current) => (current?.date === cell.date ? null : cell))
                }
              />
            </div>
            {selectedCell ? (
              <div className="mt-3 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-ink">{formatLongDate(selectedCell.date)}</h3>
                  <span className="text-[0.7rem] font-semibold text-accent">
                    {selectedCell.completed}/{selectedCell.scheduled} complete ·{" "}
                    {percent(selectedCell.rate)}
                  </span>
                </div>
                {selectedCell.habits.length === 0 ? (
                  <p className="mt-1.5 text-xs text-muted">No habits were scheduled.</p>
                ) : (
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {selectedCell.habits.map((habit) => (
                      <li
                        key={`${habit.habitId}-${habit.name}`}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-solid)]/60 px-2 py-1.5 text-xs"
                      >
                        <span className="inline-flex min-w-0 items-center gap-1.5">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ background: hueColor(habit.hue) }}
                          />
                          <span className="truncate text-soft">{habit.name}</span>
                        </span>
                        <span className="shrink-0 text-[0.65rem] font-semibold text-muted">
                          {occurrenceLabel(habit.status)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            <section className="card overflow-hidden">
              <div className="border-b border-line px-4 py-3.5 sm:px-5">
                <h2 className="text-base font-bold text-ink">Habit performance</h2>
                <p className="text-xs text-muted">Sorted by completion rate in this range</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {selectedHabits.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-muted">
                    No habits were scheduled in this range.
                  </p>
                ) : (
                  selectedHabits.map((habit) => (
                    <div key={habit.habitId} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <ProgressRing
                        value={habit.rate}
                        size={44}
                        stroke={4.5}
                        hue={habit.hue}
                        label={`${habit.name} completion`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink">
                            {habit.icon ? `${habit.icon} ` : ""}
                            {habit.name}
                          </p>
                          <span className="shrink-0 text-[0.65rem] font-medium text-muted">
                            {habit.completed}/{habit.scheduled}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="progress-track flex-1">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${habit.rate * 100}%`,
                                background: hueColor(habit.hue),
                              }}
                            />
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-[0.62rem] font-semibold text-muted">
                            <Flame className="size-3 text-[var(--brand-coral)]" />
                            {habit.currentStreak}d
                          </span>
                        </div>
                        <p className="mt-1 text-[0.6rem] text-faint">
                          {habit.categoryName ?? "Uncategorised"} · {durationLabel(habit.timerMinutes)} focus
                          {habit.partial > 0 ? ` · ${habit.partial} partial` : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <section className="card p-4 sm:p-5">
                <h2 className="text-base font-bold text-ink">Categories</h2>
                <p className="text-xs text-muted">Where your effort is going</p>
                <div className="mt-3 space-y-3">
                  {activeStats.categories.length === 0 ? (
                    <p className="text-xs text-muted">No categories yet.</p>
                  ) : (
                    activeStats.categories.map((category) => (
                      <div key={category.categoryId ?? category.name}>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: hueColor(category.hue) }}
                            />
                            <span className="truncate font-medium text-soft">{category.name}</span>
                          </span>
                          <span className="shrink-0 font-semibold text-muted">
                            {percent(category.rate)}
                          </span>
                        </div>
                        <div className="progress-track mt-1.5">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${category.rate * 100}%`,
                              background: hueColor(category.hue),
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[0.6rem] text-faint">
                          {category.completed}/{category.scheduled} completed
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="card p-4 sm:p-5">
                <h2 className="text-base font-bold text-ink">Focus time</h2>
                <p className="text-xs text-muted">Minutes recorded per day</p>
                <div className="mt-3">
                  <TrendChart
                    points={focusTrend}
                    hue={190}
                    height={150}
                    formatValue={(value) => `${Math.round(value)}m`}
                    showDots={false}
                  />
                </div>
              </section>

              {activeStats.bestHabit ? (
                <section className="card p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="size-4 text-[var(--success)]" />
                    <h2 className="text-sm font-bold text-ink">Most consistent</h2>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {activeStats.bestHabit.icon ? `${activeStats.bestHabit.icon} ` : ""}
                    {activeStats.bestHabit.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {percent(activeStats.bestHabit.rate)} completion ·{" "}
                    {activeStats.bestHabit.currentStreak}-day streak
                  </p>
                  {activeStats.worstHabit ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="size-4 text-[var(--warning)]" />
                        <h3 className="text-sm font-bold text-ink">Needs a gentler look</h3>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-ink">
                        {activeStats.worstHabit.icon ? `${activeStats.worstHabit.icon} ` : ""}
                        {activeStats.worstHabit.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {percent(activeStats.worstHabit.rate)} completion · {activeStats.worstHabit.missed}{" "}
                        missed
                      </p>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </aside>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Scheduled</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                {summary?.scheduled ?? 0}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Completed</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums text-ink">
                {summary?.completed ?? 0}
                <CheckCircle2 className="size-4 text-[var(--success)]" />
              </p>
            </div>
            <div className="card p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Partial</p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold tabular-nums text-ink">
                {summary?.partial ?? 0}
                <Sparkles className="size-4 text-[var(--warning)]" />
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
