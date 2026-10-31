"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { HabitForm } from "@/components/habits/HabitForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageSkeleton } from "@/components/ui/Spinner";
import { Segmented } from "@/components/ui/Segmented";
import { formatDateLabel } from "@/lib/dates";
import type { HabitDTO, HabitStatDTO } from "@/lib/types";
import { cn, hueColor, percent } from "@/lib/ui";

type StatusFilter = "active" | "paused" | "archived";

export function HabitsView() {
  const { data, categories, archiveHabit, restoreHabit, loading } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HabitDTO | null>(null);
  const [confirm, setConfirm] = useState<{
    habit: HabitDTO;
    mode: "archive" | "delete";
  } | null>(null);

  const statsById = useMemo(() => {
    const map = new Map<string, HabitStatDTO>();
    for (const stat of data?.stats.habits ?? []) map.set(stat.habitId, stat);
    return map;
  }, [data]);

  const counts = useMemo(() => {
    const source = data?.habits ?? [];
    return {
      active: source.filter((habit) => habit.status === "active").length,
      paused: source.filter((habit) => habit.status === "paused").length,
      archived: source.filter((habit) => habit.status === "archived").length,
    };
  }, [data]);

  const habits = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data?.habits ?? []).filter((habit) => {
      if (habit.status !== status) return false;
      if (category !== "all") {
        if (category === "none" ? habit.categoryId !== null : habit.categoryId !== category) {
          return false;
        }
      }
      if (!term) return true;
      return (
        habit.name.toLowerCase().includes(term) ||
        (habit.description ?? "").toLowerCase().includes(term) ||
        (habit.categoryName ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, query, category, status]);

  if (!data && loading) return <PageSkeleton />;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Your collection"
        title="Habits"
        description="Small, repeatable actions with steps that make progress impossible to fake."
        actions={
          <button type="button" className="btn btn-brand" onClick={openCreate}>
            <Plus className="size-4" /> New habit
          </button>
        }
      />

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            className="input pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search habits, notes or categories…"
            aria-label="Search habits"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="select !w-auto min-w-36"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value="none">Uncategorised</option>
          </select>
          <Segmented
            value={status}
            onChange={setStatus}
            ariaLabel="Filter by status"
            options={[
              { value: "active", label: "Active", count: counts.active },
              { value: "paused", label: "Paused", count: counts.paused },
              { value: "archived", label: "Archived", count: counts.archived },
            ]}
          />
        </div>
      </div>

      {habits.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={status === "archived" ? Archive : ListChecks}
            title={
              query || category !== "all"
                ? "No habits match those filters"
                : status === "active"
                  ? data?.habits.length
                    ? "No active habits"
                    : "Your first habit is waiting"
                  : status === "paused"
                    ? "Nothing paused"
                    : "No archived habits"
            }
            description={
              query || category !== "all"
                ? "Try a different search term or category."
                : status === "active"
                  ? data?.habits.length
                    ? "Restore an archived habit or create a new one to get moving."
                    : "Start with something so small it would be silly not to do it."
                  : status === "paused"
                    ? "Paused habits keep their history and can return whenever you are ready."
                    : "Archived habits keep their full history. You can restore them any time."
            }
            action={
              status === "active" ? (
                <button type="button" className="btn btn-brand" onClick={openCreate}>
                  <Plus className="size-4" /> Create a habit
                </button>
              ) : status === "archived" && counts.archived > 0 ? (
                <button type="button" className="btn btn-outline" onClick={() => setStatus("active")}>
                  Back to active
                </button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => {
            const stat = statsById.get(habit.id);
            const colour = hueColor(habit.hue);
            const archived = habit.status === "archived";
            return (
              <article
                key={habit.id}
                className={cn(
                  "card card-interactive flex flex-col overflow-hidden",
                  archived && "opacity-80",
                )}
                style={{ "--habit": colour } as React.CSSProperties}
              >
                <div className="h-1.5 w-full" style={{ background: colour }} aria-hidden="true" />
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-xl border text-xl"
                      style={{
                        background: `color-mix(in oklch, ${colour} 14%, transparent)`,
                        borderColor: `color-mix(in oklch, ${colour} 26%, transparent)`,
                      }}
                      aria-hidden="true"
                    >
                      {habit.icon || "✦"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-base font-bold text-ink">{habit.name}</h2>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[0.7rem] text-muted">
                        {habit.categoryName ? <span>{habit.categoryName}</span> : <span>Uncategorised</span>}
                        <span className="text-faint">·</span>
                        <span>{habit.scheduleLabel}</span>
                      </p>
                    </div>
                    <details className="relative shrink-0">
                      <summary
                        className="btn btn-ghost btn-icon btn-sm cursor-pointer list-none"
                        aria-label={`Actions for ${habit.name}`}
                      >
                        <MoreHorizontal className="size-4" />
                      </summary>
                      <div className="card-solid absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-line-strong p-1 shadow-[var(--shadow-lg)]">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-soft hover:bg-surface-2 hover:text-ink"
                          onClick={() => {
                            setEditing(habit);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="size-3.5" /> Edit habit
                        </button>
                        {archived ? (
                          <>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-soft hover:bg-surface-2 hover:text-ink"
                              onClick={() => void restoreHabit(habit.id)}
                            >
                              <ArchiveRestore className="size-3.5" /> Restore
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                              onClick={() => setConfirm({ habit, mode: "delete" })}
                            >
                              <Trash2 className="size-3.5" /> Delete permanently
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                            onClick={() => setConfirm({ habit, mode: "archive" })}
                          >
                            <Archive className="size-3.5" /> Archive habit
                          </button>
                        )}
                      </div>
                    </details>
                  </div>

                  {habit.description ? (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                      {habit.description}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1">
                    {habit.steps.slice(0, 3).map((step) => (
                      <span key={step.id} className="chip !text-[0.65rem]">
                        {step.required ? null : <span className="text-faint">~</span>}
                        {step.name}
                      </span>
                    ))}
                    {habit.steps.length > 3 ? (
                      <span className="chip !text-[0.65rem]">+{habit.steps.length - 3}</span>
                    ) : null}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-faint">
                        Streak
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-bold tabular-nums text-ink">
                        <Flame className="size-3.5 text-[var(--brand-coral)]" />
                        {stat?.currentStreak ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-faint">
                        30 days
                      </p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-ink">
                        {stat ? percent(stat.rate) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-faint">
                        Timer
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm font-bold tabular-nums text-ink">
                        <Clock3 className="size-3.5 text-muted" />
                        {habit.timerMinutes > 0 ? `${habit.timerMinutes}m` : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[0.65rem] text-faint">
                      {habit.endDate
                        ? `Until ${formatDateLabel(habit.endDate, { short: true })}`
                        : `Since ${formatDateLabel(habit.startDate, { short: true })}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        href="/calendar"
                        className="btn btn-ghost btn-sm"
                        aria-label={`View ${habit.name} in the calendar`}
                      >
                        <CalendarDays className="size-3.5" /> Calendar
                      </Link>
                      <button
                        type="button"
                        className="btn btn-soft btn-sm"
                        onClick={() => {
                          setEditing(habit);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {habits.length > 0 ? (
        <p className="flex items-center justify-center gap-1.5 text-center text-[0.7rem] text-faint">
          <CheckCircle2 className="size-3.5" />
          History is preserved when you edit or archive a habit.
        </p>
      ) : null}

      <div className="card flex flex-col items-start justify-between gap-3 border-dashed p-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Sparkles className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Need a change of pace?</p>
            <p className="text-xs text-muted">
              Pause a habit instead of deleting it, and its streak history stays safe.
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={openCreate}>
          <Plus className="size-4" /> Add another
        </button>
      </div>

      <HabitForm open={formOpen} onClose={() => setFormOpen(false)} habit={editing} />

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm?.mode === "delete" ? "Delete permanently?" : "Archive this habit?"}
        message={
          confirm?.mode === "delete"
            ? `“${confirm.habit.name}” and every recorded completion will be removed for good. This cannot be undone.`
            : `“${confirm?.habit.name ?? "This habit"}” will disappear from today and the calendar, but all of its history is kept. You can restore it later.`
        }
        confirmLabel={confirm?.mode === "delete" ? "Delete forever" : "Archive habit"}
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.mode === "delete") {
            await archiveHabit(confirm.habit.id, true);
          } else {
            await archiveHabit(confirm.habit.id);
          }
        }}
      />
    </div>
  );
}
