"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Flame,
  ListTodo,
  Plus,
  Sparkles,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { HabitForm } from "@/components/habits/HabitForm";
import { OccurrenceCard } from "@/components/habits/OccurrenceCard";
import { TaskForm } from "@/components/calendar/TaskForm";
import { TrendChart } from "@/components/charts/TrendChart";
import { Heatmap } from "@/components/charts/Heatmap";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { StatCard } from "@/components/ui/StatCard";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageSkeleton } from "@/components/ui/Spinner";
import { formatDateLabel, formatLongDate, todayKey } from "@/lib/dates";
import type { OccurrenceDTO } from "@/lib/types";
import {
  durationLabel,
  greeting,
  percent,
  relativeTime,
} from "@/lib/ui";

type Filter = "all" | "todo" | "done";

export function DashboardView() {
  const { data, user, loading, error, toggleTask } = useApp();
  const [filter, setFilter] = useState<Filter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OccurrenceDTO | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);

  const today = todayKey(user.timezone);
  const summary = data?.stats.summary;

  const occurrences = useMemo(() => {
    if (!data) return [];
    if (filter === "done") {
      return data.today.filter((item) => item.status === "completed");
    }
    if (filter === "todo") {
      return data.today.filter((item) => item.status !== "completed");
    }
    return data.today;
  }, [data, filter]);

  if (!data && loading) return <PageSkeleton />;

  if (!data) {
    return (
      <div className="card p-6">
        <EmptyState
          icon={Sparkles}
          title="We could not reach your habits"
          description="You may be offline with no saved snapshot yet. Reconnect and try again."
          action={
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          }
        />
      </div>
    );
  }

  const done = data.today.filter((item) => item.status === "completed").length;
  const scheduled = data.today.length;
  const rate = scheduled > 0 ? done / scheduled : 0;
  const todo = scheduled - done;
  const trend = data.stats.daily.slice(-14).map((day) => ({
    label: formatDateLabel(day.date, { short: true }),
    value: day.rate,
  }));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
            {formatLongDate(today)}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {greeting()}, {user.name.split(" ")[0]}.
          </h1>
          <p className="mt-1 text-sm text-muted">
            {scheduled === 0
              ? "Nothing is scheduled today — a good day to plan something gentle."
              : done === scheduled
                ? "Everything on today's list is complete. Enjoy the glow."
                : `${todo} ${todo === 1 ? "habit is" : "habits are"} still waiting for you today.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setTaskOpen(true)}>
            <ListTodo className="size-4" /> Add task
          </button>
          <button type="button" className="btn btn-brand" onClick={openCreate}>
            <Plus className="size-4" /> New habit
          </button>
        </div>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[color-mix(in_oklch,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--warning)]"
        >
          {error}
        </div>
      ) : null}

      <section className="card card-glow relative overflow-hidden p-5 sm:p-7">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--brand-violet)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-1/3 size-56 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--brand-teal)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-accent">
              <Sparkles className="size-3" /> Today&apos;s momentum
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {scheduled === 0
                ? "A blank canvas"
                : rate === 1
                  ? "A perfect day, already"
                  : rate >= 0.5
                    ? "More than halfway there"
                    : "One step is enough to begin"}
            </h2>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              {scheduled === 0
                ? "Add a habit or a one-off task and it will appear here."
                : `${done} of ${scheduled} habits complete. ${summary ? `${summary.currentStreak}-day best active streak.` : ""}`}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="chip">
                <Flame className="size-3 text-[var(--brand-coral)]" />
                {summary?.currentStreak ?? 0}-day streak
              </span>
              <span className="chip">
                <Timer className="size-3 text-[var(--brand-teal)]" />
                {durationLabel(summary?.timerMinutes ?? 0)} focused
              </span>
              <span className="chip">
                <TrendingUp className="size-3 text-[var(--brand-blue)]" />
                {percent(summary?.rate ?? 0)} this month
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <ProgressRing
              value={rate}
              size={116}
              stroke={10}
              hue={user.accentHue}
              label="Today's completion"
            />
            <div className="hidden sm:block">
              <p className="text-3xl font-bold tabular-nums text-ink">
                {done}
                <span className="text-lg font-semibold text-faint">/{scheduled}</span>
              </p>
              <p className="text-xs font-medium text-muted">habits complete</p>
              <p className="mt-2 text-[0.7rem] text-faint">
                {todo === 0 ? "All clear" : `${todo} to go`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Completed today"
          value={`${done}`}
          detail={`of ${scheduled} scheduled`}
          icon={CheckCircle2}
          hue={158}
          accent
        />
        <StatCard
          label="Current streak"
          value={`${summary?.currentStreak ?? 0} days`}
          detail={`Longest: ${summary?.longestStreak ?? 0} days`}
          icon={Flame}
          hue={28}
        />
        <StatCard
          label="30-day rate"
          value={percent(summary?.rate ?? 0)}
          detail={`${summary?.completed ?? 0} of ${summary?.scheduled ?? 0} completed`}
          icon={TrendingUp}
          hue={248}
        />
        <StatCard
          label="Focus time"
          value={durationLabel(summary?.timerMinutes ?? 0)}
          detail={`${summary?.activeDays ?? 0} active days`}
          icon={Clock3}
          hue={190}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">Today&apos;s habits</h2>
            <Segmented
              value={filter}
              onChange={setFilter}
              ariaLabel="Filter today's habits"
              size="sm"
              options={[
                { value: "all", label: "All", count: data.today.length },
                { value: "todo", label: "To do", count: todo },
                { value: "done", label: "Done", count: done },
              ]}
            />
          </div>

          {data.today.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={data.habits.length === 0 ? Sparkles : CalendarDays}
                title={data.habits.length === 0 ? "Plant your first habit" : "Nothing today"}
                description={
                  data.habits.length === 0
                    ? "Create a habit with a few honest steps. Start tiny — one push-up counts."
                    : "No habits are scheduled today. Browse the calendar to see what is coming next."
                }
                action={
                  data.habits.length === 0 ? (
                    <button type="button" className="btn btn-brand" onClick={openCreate}>
                      <Plus className="size-4" /> Create a habit
                    </button>
                  ) : (
                    <Link href="/calendar" className="btn btn-outline">
                      Open calendar <ArrowRight className="size-4" />
                    </Link>
                  )
                }
              />
            </div>
          ) : occurrences.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={CheckCircle2}
                title={filter === "done" ? "Nothing completed yet" : "All done for today"}
                description={
                  filter === "done"
                    ? "Check off a step and it will show up here."
                    : "Every habit on today's list is complete. Rest is part of the routine."
                }
                compact
              />
            </div>
          ) : (
            <div className="stagger space-y-3">
              {occurrences.map((occurrence) => (
                <OccurrenceCard
                  key={occurrence.id}
                  occurrence={occurrence}
                  onEdit={(item) => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">Fourteen-day rhythm</h2>
                <p className="text-[0.7rem] text-muted">Completion rate, day by day</p>
              </div>
              <Link href="/analytics" className="btn btn-ghost btn-sm" aria-label="Open analytics">
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-3">
              <TrendChart
                points={trend}
                hue={user.accentHue}
                height={170}
                max={1}
                formatValue={(value) => percent(value)}
              />
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">Thirty days in colour</h2>
                <p className="text-[0.7rem] text-muted">Every square is a day</p>
              </div>
              <Link href="/analytics" className="text-[0.7rem] font-semibold text-accent hover:underline">
                Details
              </Link>
            </div>
            <div className="mt-3">
              <Heatmap
                cells={data.stats.heatmap}
                hue={user.accentHue}
                weekStartsOn={user.weekStartsOn}
                compact
                showLegend={false}
              />
            </div>
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-ink">Today&apos;s tasks</h2>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setTaskOpen(true)}
                aria-label="Add a task"
              >
                <Plus className="size-4" />
              </button>
            </div>
            {data.todayTasks.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-line-strong px-3 py-4 text-center text-xs text-muted">
                No one-off tasks today.
              </p>
            ) : (
              <ul className="mt-3 space-y-1">
                {data.todayTasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={task.completed}
                      aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
                      onClick={() => void toggleTask(task)}
                      className="check size-5 rounded-md"
                      data-checked={task.completed}
                      style={{
                        background: task.completed ? `oklch(0.68 0.2 ${task.hue})` : undefined,
                        borderColor: task.completed
                          ? "transparent"
                          : `oklch(0.68 0.2 ${task.hue} / 0.5)`,
                      }}
                    >
                      {task.completed ? <Check className="size-3" strokeWidth={3} /> : null}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          task.completed
                            ? "truncate text-xs text-muted line-through"
                            : "truncate text-xs font-medium text-soft"
                        }
                      >
                        {task.title}
                      </p>
                      {task.time ? (
                        <p className="text-[0.6rem] text-faint">{task.time}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-accent" />
              <h2 className="text-sm font-bold text-ink">Recent activity</h2>
            </div>
            {data.recent.length === 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Your story starts with the first checked step.
              </p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {data.recent.slice(0, 5).map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-1 size-2 shrink-0 rounded-full"
                      style={{ background: `oklch(0.68 0.2 ${item.hue})` }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-soft">{item.title}</p>
                      <p className="text-[0.62rem] text-faint">
                        {item.detail} · {relativeTime(item.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {data.upcomingTasks.length > 0 ? (
            <section className="card p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-[var(--brand-coral)]" />
                <h2 className="text-sm font-bold text-ink">Coming up</h2>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {data.upcomingTasks.slice(0, 4).map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Circle className="size-2 shrink-0" style={{ color: `oklch(0.68 0.2 ${task.hue})` }} />
                      <span className="truncate text-soft">{task.title}</span>
                    </span>
                    <span className="shrink-0 text-[0.62rem] text-faint">
                      {formatDateLabel(task.date, { short: true })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      <HabitForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        habit={editing?.habit ?? null}
        defaultDate={today}
      />
      <TaskForm
        open={taskOpen}
        onClose={() => setTaskOpen(false)}
        defaultDate={today}
      />
    </div>
  );
}
