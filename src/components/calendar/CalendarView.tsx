"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ListTodo,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { OccurrenceCard } from "@/components/habits/OccurrenceCard";
import { HabitForm } from "@/components/habits/HabitForm";
import { TaskForm } from "@/components/calendar/TaskForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import { apiFetch, ApiError } from "@/lib/client/api";
import {
  addDays,
  addMonths,
  formatDateLabel,
  formatLongDate,
  formatMonthLabel,
  startOfMonth,
  startOfWeek,
  todayKey,
  weekdayOrder,
  WEEKDAY_TINY,
} from "@/lib/dates";
import type {
  CalendarDTO,
  CalendarDayDTO,
  CalendarView,
  OccurrenceDTO,
  TaskDTO,
} from "@/lib/types";
import { cn, hueColor } from "@/lib/ui";

const VIEW_OPTIONS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "list", label: "List" },
];

function TaskRow({
  task,
  onEdit,
  onDelete,
}: {
  task: TaskDTO;
  onEdit: (task: TaskDTO) => void;
  onDelete: (task: TaskDTO) => void;
}) {
  const { toggleTask } = useApp();
  const colour = hueColor(task.hue);
  return (
    <div
      className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/60 px-2.5 py-2"
      style={{ borderLeft: `3px solid ${colour}` }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={task.completed}
        aria-label={`Mark ${task.title} ${task.completed ? "incomplete" : "complete"}`}
        onClick={() => void toggleTask(task)}
        className="check size-5 rounded-md"
        data-checked={task.completed}
        style={{
          background: task.completed ? colour : undefined,
          borderColor: task.completed ? "transparent" : `color-mix(in oklch, ${colour} 50%, transparent)`,
        }}
      >
        {task.completed ? <Check className="size-3" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-xs font-medium",
            task.completed ? "text-muted line-through" : "text-soft",
          )}
        >
          {task.title}
        </p>
        <p className="flex items-center gap-1.5 text-[0.6rem] text-faint">
          <span className="rounded bg-surface-3 px-1 py-px font-semibold uppercase tracking-wide">
            Task
          </span>
          {task.time ? (
            <span className="inline-flex items-center gap-0.5">
              <Clock3 className="size-2.5" /> {task.time}
            </span>
          ) : null}
          {task.categoryName ? <span>· {task.categoryName}</span> : null}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm !size-7"
          onClick={() => onEdit(task)}
          aria-label={`Edit ${task.title}`}
        >
          <Pencil className="size-3" />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm !size-7 text-[var(--danger)]"
          onClick={() => onDelete(task)}
          aria-label={`Delete ${task.title}`}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
    </div>
  );
}

function countItems(day: CalendarDayDTO) {
  return day.occurrences.length + day.tasks.length;
}

export function CalendarView() {
  const { data, user, refresh, loading, revision, addOccurrence, deleteTask } = useApp();
  const today = todayKey(user.timezone);
  const [view, setView] = useState<CalendarView>(user.defaultCalendarView ?? "month");
  const [anchor, setAnchor] = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);
  const [calendar, setCalendar] = useState<CalendarDTO | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [habitFormOpen, setHabitFormOpen] = useState(false);
  const [editingOccurrence, setEditingOccurrence] = useState<OccurrenceDTO | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskDTO | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(today);
  const [scheduleHabit, setScheduleHabit] = useState("");
  const [scheduling, setScheduling] = useState(false);

  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(anchor), user.weekStartsOn);
      return { from: start, to: addDays(start, 41) };
    }
    if (view === "week") {
      const start = startOfWeek(anchor, user.weekStartsOn);
      return { from: start, to: addDays(start, 6) };
    }
    if (view === "day") return { from: anchor, to: anchor };
    return { from: anchor, to: addDays(anchor, 29) };
  }, [anchor, view, user.weekStartsOn]);

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const result = await apiFetch<CalendarDTO>(
        `/api/calendar?from=${range.from}&to=${range.to}`,
      );
      setCalendar(result);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Could not load the calendar. Check your connection and try again.",
      );
    } finally {
      setFetching(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load, revision]);

  useEffect(() => {
    if (selectedDay < range.from || selectedDay > range.to) {
      setSelectedDay(anchor);
    }
  }, [range.from, range.to, selectedDay, anchor]);

  const dayMap = useMemo(() => {
    const map = new Map(calendar?.days.map((day) => [day.date, day]) ?? []);
    return map;
  }, [calendar]);

  const totals = useMemo(() => {
    const days = calendar?.days ?? [];
    const occurrences = days.flatMap((day) => day.occurrences);
    return {
      scheduled: occurrences.length,
      completed: occurrences.filter((item) => item.status === "completed").length,
      tasks: days.reduce((sum, day) => sum + day.tasks.length, 0),
    };
  }, [calendar]);

  const shift = (direction: -1 | 1) => {
    let next = anchor;
    if (view === "month") next = addMonths(anchor, direction);
    else if (view === "week") next = addDays(anchor, direction * 7);
    else if (view === "day") next = addDays(anchor, direction);
    else next = addDays(anchor, direction * 30);
    setAnchor(next);
    setSelectedDay(next);
  };

  const changeView = (next: CalendarView) => {
    setView(next);
    setSelectedDay(anchor);
  };

  const goToday = () => {
    setAnchor(today);
    setSelectedDay(today);
  };

  const rangeLabel =
    view === "month"
      ? formatMonthLabel(anchor)
      : view === "week"
        ? `${formatDateLabel(range.from, { short: true })} – ${formatDateLabel(range.to, { short: true })}`
        : view === "day"
          ? formatLongDate(anchor)
          : `${formatDateLabel(range.from, { short: true })} – ${formatDateLabel(range.to, { short: true })}`;

  const selected = dayMap.get(selectedDay);
  const activeHabits = (data?.habits ?? []).filter((habit) => habit.status === "active");

  const submitSchedule = async () => {
    if (!scheduleHabit) return;
    setScheduling(true);
    const ok = await addOccurrence(scheduleHabit, scheduleDate);
    setScheduling(false);
    if (ok) {
      setScheduleOpen(false);
      await load();
    }
  };

  if (!data && loading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <Spinner size={26} className="text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Time, in colour"
        title="Calendar"
        description="Month, week, day or agenda. Move things without losing the story behind them."
        actions={
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setScheduleDate(selectedDay);
                setScheduleHabit(activeHabits[0]?.id ?? "");
                setScheduleOpen(true);
              }}
              disabled={activeHabits.length === 0}
            >
              <CalendarDays className="size-4" /> Schedule habit
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setEditingTask(null);
                setTaskOpen(true);
              }}
            >
              <ListTodo className="size-4" /> Add task
            </button>
            <button
              type="button"
              className="btn btn-brand btn-sm"
              onClick={() => {
                setEditingOccurrence(null);
                setHabitFormOpen(true);
              }}
            >
              <Plus className="size-4" /> New habit
            </button>
          </>
        }
      />

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="btn btn-outline btn-icon btn-sm"
            onClick={() => shift(-1)}
            aria-label="Previous period"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="btn btn-outline btn-icon btn-sm"
            onClick={() => shift(1)}
            aria-label="Next period"
          >
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={goToday}>
            Today
          </button>
          <h2 className="ml-1 truncate text-sm font-bold text-ink sm:text-base">{rangeLabel}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[0.65rem] text-muted sm:flex">
            <span className="size-2 rounded-full bg-[var(--success)]" />
            {totals.completed}/{totals.scheduled} complete
          </span>
          <Segmented
            value={view}
            onChange={changeView}
            options={VIEW_OPTIONS}
            ariaLabel="Calendar view"
            size="sm"
          />
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => {
              void load();
              void refresh(true);
            }}
            aria-label="Refresh calendar"
          >
            <RotateCcw className={cn("size-4", fetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-[color-mix(in_oklch,var(--warning)_35%,transparent)] bg-[var(--warning-soft)] px-3.5 py-2.5 text-xs font-medium text-[var(--warning)]"
        >
          {error}
          <button type="button" className="ml-2 font-bold underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : null}

      {view === "month" ? (
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2/60">
            {weekdayOrder(user.weekStartsOn).map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[0.62rem] font-bold uppercase tracking-wide text-muted"
              >
                <span className="hidden sm:inline">{WEEKDAY_TINY[day]}</span>
                <span className="sm:hidden">{WEEKDAY_TINY[day][0]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {(calendar?.days ?? Array.from({ length: 42 }, () => null)).map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`placeholder-${index}`}
                    className="min-h-16 animate-pulse border-b border-r border-line bg-surface-2/30 sm:min-h-24"
                  />
                );
              }
              const inMonth = day.date.slice(0, 7) === anchor.slice(0, 7);
              const isToday = day.date === today;
              const isSelected = day.date === selectedDay;
              const completed = day.occurrences.filter((item) => item.status === "completed").length;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDay(day.date)}
                  aria-pressed={isSelected}
                  aria-label={`${formatLongDate(day.date)} — ${day.occurrences.length} habits, ${day.tasks.length} tasks`}
                  className={cn(
                    "group relative min-h-16 border-b border-r border-line p-1.5 text-left transition-colors hover:bg-[var(--accent-soft)] sm:min-h-24 sm:p-2",
                    !inMonth && "bg-surface-2/30",
                    isSelected && "bg-[var(--accent-soft)]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-grid size-6 place-items-center rounded-full text-[0.68rem] font-bold tabular-nums",
                      isToday
                        ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                        : inMonth
                          ? "text-soft"
                          : "text-faint",
                    )}
                  >
                    {Number(day.date.slice(8, 10))}
                  </span>
                  <div className="mt-1 hidden flex-wrap gap-0.5 sm:flex">
                    {day.occurrences.slice(0, 3).map((occurrence) => (
                      <span
                        key={occurrence.id}
                        title={`${occurrence.habit.name} — ${occurrence.status}`}
                        className="size-1.5 rounded-full"
                        style={{
                          background:
                            occurrence.status === "completed"
                              ? "var(--success)"
                              : occurrence.status === "skipped"
                                ? "var(--surface-3)"
                                : hueColor(occurrence.habit.hue),
                          opacity: occurrence.status === "skipped" ? 0.7 : 1,
                        }}
                      />
                    ))}
                    {day.occurrences.length > 3 ? (
                      <span className="text-[0.55rem] font-semibold text-faint">
                        +{day.occurrences.length - 3}
                      </span>
                    ) : null}
                  </div>
                  {day.tasks.length > 0 ? (
                    <span className="absolute bottom-1 right-1.5 hidden items-center gap-0.5 text-[0.55rem] font-semibold text-muted sm:flex">
                      <ListTodo className="size-2.5" /> {day.tasks.length}
                    </span>
                  ) : null}
                  {day.occurrences.length > 0 && completed === day.occurrences.length ? (
                    <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[var(--success)] sm:right-2 sm:top-2" />
                  ) : null}
                  <span className="absolute bottom-1.5 left-1.5 flex gap-0.5 sm:hidden">
                    {day.occurrences.slice(0, 4).map((occurrence) => (
                      <span
                        key={occurrence.id}
                        className="size-1 rounded-full"
                        style={{
                          background:
                            occurrence.status === "completed"
                              ? "var(--success)"
                              : hueColor(occurrence.habit.hue),
                        }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {view === "week" ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {weekdayOrder(user.weekStartsOn).map((weekday, index) => {
            const date = addDays(range.from, index);
            const day = dayMap.get(date);
            const isToday = date === today;
            return (
              <div
                key={weekday}
                className={cn(
                  "card min-h-32 p-2.5",
                  isToday && "border-[var(--accent-line)]",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDay(date);
                    setAnchor(date);
                    setView("day");
                  }}
                  className="flex w-full items-center justify-between gap-1 rounded-lg px-1 py-0.5 text-left hover:bg-surface-2"
                >
                  <span>
                    <span className="block text-[0.6rem] font-bold uppercase tracking-wide text-faint">
                      {WEEKDAY_TINY[weekday]}
                    </span>
                    <span
                      className={cn(
                        "block text-sm font-bold",
                        isToday ? "text-accent" : "text-ink",
                      )}
                    >
                      {Number(date.slice(8, 10))}
                    </span>
                  </span>
                  <ChevronRight className="size-3 text-faint" />
                </button>
                <div className="mt-1.5 space-y-1">
                  {(day?.occurrences ?? []).slice(0, 4).map((occurrence) => (
                    <div
                      key={occurrence.id}
                      className="truncate rounded-md px-1.5 py-1 text-[0.62rem] font-medium"
                      style={{
                        background: `color-mix(in oklch, ${hueColor(occurrence.habit.hue)} 14%, transparent)`,
                        color: occurrence.status === "completed" ? "var(--success)" : "var(--text-soft)",
                      }}
                      title={`${occurrence.habit.name} — ${occurrence.status}`}
                    >
                      {occurrence.habit.icon ? `${occurrence.habit.icon} ` : ""}
                      {occurrence.habit.name}
                    </div>
                  ))}
                  {(day?.tasks ?? []).map((task) => (
                    <div
                      key={task.id}
                      className="truncate rounded-md bg-surface-3 px-1.5 py-1 text-[0.62rem] text-muted"
                      title={task.title}
                    >
                      ☐ {task.title}
                    </div>
                  ))}
                  {countItems(day ?? { date, occurrences: [], tasks: [] }) === 0 ? (
                    <p className="px-1 py-2 text-center text-[0.6rem] text-faint">—</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {view === "month" || view === "day" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink">
              {selectedDay === today ? "Today" : formatDateLabel(selectedDay)}
              <span className="ml-2 text-xs font-normal text-muted">
                {selected?.occurrences.length ?? 0} habits · {selected?.tasks.length ?? 0} tasks
              </span>
            </h2>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setScheduleDate(selectedDay);
                  setScheduleHabit(activeHabits[0]?.id ?? "");
                  setScheduleOpen(true);
                }}
                disabled={activeHabits.length === 0}
              >
                <CalendarDays className="size-3.5" /> Schedule
              </button>
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => {
                  setEditingTask(null);
                  setTaskOpen(true);
                }}
              >
                <Plus className="size-3.5" /> Task
              </button>
            </div>
          </div>

          {fetching && !calendar ? (
            <div className="flex justify-center py-10">
              <Spinner size={24} className="text-accent" />
            </div>
          ) : countItems(selected ?? { date: selectedDay, occurrences: [], tasks: [] }) === 0 ? (
            <div className="card">
              <EmptyState
                icon={Sparkles}
                title="A clear day"
                description="Nothing is scheduled here yet. Add a task, or schedule one of your habits for this day."
                compact
                action={
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      setEditingTask(null);
                      setTaskOpen(true);
                    }}
                  >
                    <Plus className="size-4" /> Add something
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {(selected?.tasks ?? []).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={(item) => {
                    setEditingTask(item);
                    setTaskOpen(true);
                  }}
                  onDelete={setDeleteTaskTarget}
                />
              ))}
              {(selected?.occurrences ?? []).map((occurrence) => (
                <OccurrenceCard
                  key={occurrence.id}
                  occurrence={occurrence}
                  onEdit={(item) => {
                    setEditingOccurrence(item);
                    setHabitFormOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {view === "list" ? (
        <section className="space-y-4">
          {(calendar?.days ?? []).filter((day) => countItems(day) > 0).length === 0 ? (
            <div className="card">
              <EmptyState
                icon={CalendarDays}
                title="Nothing in this window"
                description="Try another period, or add a habit or task to get started."
              />
            </div>
          ) : (
            (calendar?.days ?? [])
              .filter((day) => countItems(day) > 0)
              .map((day) => (
                <div key={day.date} className="space-y-2">
                  <div className="sticky top-14 z-10 flex items-center gap-2 bg-[var(--bg)]/90 py-1 backdrop-blur lg:top-0">
                    <h3
                      className={cn(
                        "text-sm font-bold",
                        day.date === today ? "text-accent" : "text-ink",
                      )}
                    >
                      {day.date === today ? "Today" : formatDateLabel(day.date)}
                    </h3>
                    <span className="text-[0.65rem] text-faint">
                      {day.occurrences.length} habits · {day.tasks.length} tasks
                    </span>
                  </div>
                  <div className="space-y-2">
                    {day.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onEdit={(item) => {
                          setEditingTask(item);
                          setTaskOpen(true);
                        }}
                        onDelete={setDeleteTaskTarget}
                      />
                    ))}
                    {day.occurrences.map((occurrence) => (
                      <OccurrenceCard
                        key={occurrence.id}
                        occurrence={occurrence}
                        compact
                        onEdit={(item) => {
                          setEditingOccurrence(item);
                          setHabitFormOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))
          )}
        </section>
      ) : null}

      <HabitForm
        open={habitFormOpen}
        onClose={() => setHabitFormOpen(false)}
        habit={editingOccurrence?.habit ?? null}
        defaultDate={selectedDay}
      />
      <TaskForm
        open={taskOpen}
        onClose={() => {
          setTaskOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        defaultDate={selectedDay}
      />

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule a habit"
        description="Add one extra occurrence without changing the habit's normal rhythm."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitSchedule}
              disabled={!scheduleHabit || scheduling}
            >
              {scheduling ? <Spinner size={15} /> : <CalendarDays className="size-4" />}
              Add to {formatDateLabel(scheduleDate, { short: true })}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="schedule-habit">Habit</label>
            <select
              id="schedule-habit"
              className="select"
              value={scheduleHabit}
              onChange={(event) => setScheduleHabit(event.target.value)}
            >
              {activeHabits.map((habit) => (
                <option key={habit.id} value={habit.id}>
                  {habit.icon ? `${habit.icon} ` : ""}
                  {habit.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="schedule-date">Date</label>
            <input
              id="schedule-date"
              type="date"
              className="input"
              value={scheduleDate}
              onChange={(event) => setScheduleDate(event.target.value)}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTaskTarget !== null}
        onClose={() => setDeleteTaskTarget(null)}
        title="Delete this task?"
        message={`“${deleteTaskTarget?.title ?? "This task"}” will be removed. Habits and their history are unaffected.`}
        confirmLabel="Delete task"
        onConfirm={async () => {
          if (!deleteTaskTarget) return;
          await deleteTask(deleteTaskTarget.id);
          await refresh(true);
          setDeleteTaskTarget(null);
        }}
      />
    </div>
  );
}
