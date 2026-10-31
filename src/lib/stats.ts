/**
 * Analytics engine.
 *
 * Everything is calculated from persisted occurrences and the recurrence
 * schedule. Unscheduled days never count as missed. Streaks only walk over
 * days on which the habit was actually scheduled.
 */

import { prisma } from "./db";
import {
  addDays,
  eachDay,
  formatDateLabel,
  formatMonthLabel,
  startOfWeek,
  todayKey,
  weekdayOrder,
} from "./dates";
import { loadOccurrences } from "./habits";
import type {
  ActivityItemDTO,
  CategoryStatDTO,
  DayStatDTO,
  HabitStatDTO,
  HeatmapCellDTO,
  HeatmapHabitDTO,
  OccurrenceStatus,
  PeriodStatDTO,
  StatsDTO,
  StatsSummaryDTO,
} from "./types";

interface StatsOptions {
  habitId?: string;
  categoryId?: string;
}

interface OccurrenceRow {
  id: string;
  habitId: string;
  date: string;
  status: string;
  completedAt: Date | null;
  timerMs: number;
  habit: {
    id: string;
    name: string;
    hue: number;
    icon: string | null;
    categoryId: string | null;
    category: { id: string; name: string; hue: number } | null;
  };
}

function isCompleted(row: { status: string }): boolean {
  return row.status === "completed";
}

function isPartial(row: { status: string }): boolean {
  return row.status === "partial";
}

function statusOf(row: { status: string }): OccurrenceStatus {
  if (
    row.status === "completed" ||
    row.status === "partial" ||
    row.status === "skipped"
  ) {
    return row.status;
  }
  return "pending";
}

/** Builds daily, weekly, monthly and yearly series from occurrence rows. */
function buildPeriod(
  rows: OccurrenceRow[],
  start: string,
  end: string,
  keyOf: (date: string) => string,
  labelOf: (date: string) => string,
): PeriodStatDTO[] {
  const map = new Map<string, PeriodStatDTO>();
  const ordered = eachDay(start, end);
  for (const date of ordered) {
    const key = keyOf(date);
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: labelOf(date),
        start: date,
        end: date,
        scheduled: 0,
        completed: 0,
        partial: 0,
        rate: 0,
      });
    }
    const bucket = map.get(key)!;
    if (date < bucket.start) bucket.start = date;
    if (date > bucket.end) bucket.end = date;
  }

  for (const row of rows) {
    const bucket = map.get(keyOf(row.date));
    if (!bucket) continue;
    bucket.scheduled += 1;
    if (isCompleted(row)) bucket.completed += 1;
    else if (isPartial(row)) bucket.partial += 1;
  }

  return [...map.values()].map((bucket) => ({
    ...bucket,
    rate: bucket.scheduled > 0 ? bucket.completed / bucket.scheduled : 0,
  }));
}

/**
 * Walks scheduled occurrences backwards to compute the current streak and
 * forwards to compute the longest streak. Unscheduled days are skipped.
 */
function computeHabitStreaks(
  dates: string[],
  completedDates: Set<string>,
  today: string,
): { current: number; longest: number } {
  const scheduled = [...new Set(dates)].sort();
  let longest = 0;
  let run = 0;
  for (const date of scheduled) {
    if (completedDates.has(date)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  const past = scheduled.filter((date) => date <= today);
  let current = 0;
  for (let index = past.length - 1; index >= 0; index -= 1) {
    const date = past[index];
    if (date === today && !completedDates.has(date)) continue;
    if (completedDates.has(date)) current += 1;
    else break;
  }

  return { current, longest };
}

async function loadActivity(userId: string, from: string): Promise<ActivityItemDTO[]> {
  const since = new Date(`${from}T00:00:00.000Z`);
  const [steps, tasks, completions] = await Promise.all([
    prisma.stepCompletion.findMany({
      where: { userId, checkedAt: { gte: since } },
      include: { step: true, occurrence: { include: { habit: true } } },
      orderBy: { checkedAt: "desc" },
      take: 8,
    }),
    prisma.task.findMany({
      where: { userId, completedAt: { gte: since } },
      orderBy: { completedAt: "desc" },
      take: 6,
    }),
    prisma.occurrence.findMany({
      where: { userId, completedAt: { gte: since } },
      include: { habit: true },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
  ]);

  const items: ActivityItemDTO[] = [];
  for (const completion of completions) {
    items.push({
      id: `c-${completion.id}`,
      kind: "completion",
      title: `Completed ${completion.habit.name}`,
      detail: "All requirements met",
      hue: completion.habit.hue,
      at: (completion.completedAt ?? completion.updatedAt).toISOString(),
      date: completion.date,
    });
  }
  for (const step of steps) {
    items.push({
      id: `s-${step.id}`,
      kind: "step",
      title: `${step.step.name} checked`,
      detail: step.occurrence.habit.name,
      hue: step.occurrence.habit.hue,
      at: step.checkedAt.toISOString(),
      date: step.occurrence.date,
    });
  }
  for (const task of tasks) {
    items.push({
      id: `t-${task.id}`,
      kind: "task",
      title: `Finished “${task.title}”`,
      detail: "One-off task",
      hue: task.hue,
      at: (task.completedAt ?? task.updatedAt).toISOString(),
      date: task.date,
    });
  }

  return items
    .sort((a, b) => b.at.localeCompare(a.at))
    .filter(
      (item, index, list) =>
        index === list.findIndex((candidate) => candidate.title === item.title && candidate.date === item.date),
    )
    .slice(0, 8);
}

/** Loads the complete analytics payload for a range. */
export async function loadStats(
  userId: string,
  timezone: string,
  from: string,
  to: string,
  options: StatsOptions = {},
): Promise<StatsDTO> {
  const today = todayKey(timezone);
  await loadOccurrences(userId, from, to, { includeArchived: true });

  const habitFilter = options.habitId
    ? { id: options.habitId }
    : options.categoryId
      ? { categoryId: options.categoryId }
      : {};

  const habits = await prisma.habit.findMany({
    where: { userId, ...habitFilter },
    include: { category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const habitIds = habits.map((habit) => habit.id);

  const rows = await prisma.occurrence.findMany({
    where: {
      userId,
      habitId: { in: habitIds },
      date: { gte: from, lte: to },
    },
    include: {
      habit: { include: { category: true } },
    },
  });

  const allRows = await prisma.occurrence.findMany({
    where: { userId, habitId: { in: habitIds }, date: { lte: today } },
    select: { habitId: true, date: true, status: true },
  });

  const todayRows = await prisma.occurrence.findMany({
    where: { userId, date: today, habitId: { in: habitIds } },
    select: { status: true },
  });

  const scheduled = rows.length;
  const completed = rows.filter(isCompleted).length;
  const partial = rows.filter(isPartial).length;
  const missed = scheduled - completed - partial;

  const daily: DayStatDTO[] = eachDay(from, to).map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const dayCompleted = dayRows.filter(isCompleted).length;
    const dayPartial = dayRows.filter(isPartial).length;
    return {
      date,
      scheduled: dayRows.length,
      completed: dayCompleted,
      partial: dayPartial,
      missed: dayRows.length - dayCompleted - dayPartial,
      rate: dayRows.length > 0 ? dayCompleted / dayRows.length : 0,
      timerMinutes: Math.round(
        dayRows.reduce((sum, row) => sum + row.timerMs, 0) / 60_000,
      ),
    };
  });

  const weekly = buildPeriod(
    rows,
    from,
    to,
    (date) => startOfWeek(date, 1),
    (date) => `Week of ${formatDateLabel(startOfWeek(date, 1), { short: true })}`,
  );
  const monthly = buildPeriod(
    rows,
    from,
    to,
    (date) => date.slice(0, 7),
    (date) => formatMonthLabel(date),
  );
  const yearly = buildPeriod(
    rows,
    from,
    to,
    (date) => date.slice(0, 4),
    (date) => date.slice(0, 4),
  );

  const habitStats: HabitStatDTO[] = habits
    .map((habit) => {
      const habitRows = rows.filter((row) => row.habitId === habit.id);
      const habitCompleted = habitRows.filter(isCompleted).length;
      const habitPartial = habitRows.filter(isPartial).length;
      const allHabitRows = allRows.filter((row) => row.habitId === habit.id);
      const streaks = computeHabitStreaks(
        allHabitRows.map((row) => row.date),
        new Set(
          allHabitRows.filter(isCompleted).map((row) => row.date),
        ),
        today,
      );
      return {
        habitId: habit.id,
        name: habit.name,
        hue: habit.hue,
        icon: habit.icon,
        categoryId: habit.categoryId,
        categoryName: habit.category?.name ?? null,
        scheduled: habitRows.length,
        completed: habitCompleted,
        partial: habitPartial,
        missed: habitRows.length - habitCompleted - habitPartial,
        rate: habitRows.length > 0 ? habitCompleted / habitRows.length : 0,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        timerMinutes: Math.round(
          habitRows.reduce((sum, row) => sum + row.timerMs, 0) / 60_000,
        ),
      };
    })
    .sort((a, b) => b.scheduled - a.scheduled);

  const categoryMap = new Map<string, CategoryStatDTO>();
  for (const habit of habits) {
    const key = habit.category?.id ?? "__none";
    const name = habit.category?.name ?? "Uncategorised";
    const hue = habit.category?.hue ?? 280;
    const existing = categoryMap.get(key) ?? {
      categoryId: habit.category?.id ?? null,
      name,
      hue,
      scheduled: 0,
      completed: 0,
      partial: 0,
      rate: 0,
    };
    const habitRows = rows.filter((row) => row.habitId === habit.id);
    existing.scheduled += habitRows.length;
    existing.completed += habitRows.filter(isCompleted).length;
    existing.partial += habitRows.filter(isPartial).length;
    categoryMap.set(key, existing);
  }
  const categories = [...categoryMap.values()]
    .map((category) => ({
      ...category,
      rate:
        category.scheduled > 0 ? category.completed / category.scheduled : 0,
    }))
    .sort((a, b) => b.scheduled - a.scheduled);

  const heatmap: HeatmapCellDTO[] = eachDay(from, to).map((date) => {
    const dayRows = rows.filter((row) => row.date === date);
    const dayCompleted = dayRows.filter(isCompleted).length;
    const dayPartial = dayRows.filter(isPartial).length;
    const heatHabits: HeatmapHabitDTO[] = dayRows.map((row) => ({
      habitId: row.habit.id,
      name: row.habit.name,
      hue: row.habit.hue,
      status: statusOf(row),
      doneSteps: 0,
      requiredSteps: 0,
    }));
    return {
      date,
      scheduled: dayRows.length,
      completed: dayCompleted,
      partial: dayPartial,
      missed: dayRows.length - dayCompleted - dayPartial,
      rate: dayRows.length > 0 ? dayCompleted / dayRows.length : 0,
      status:
        dayRows.length === 0
          ? "none"
          : dayCompleted === dayRows.length
            ? "complete"
            : dayCompleted + dayPartial > 0
              ? "partial"
              : "missed",
      habits: heatHabits,
    };
  });

  const ranked = habitStats
    .filter((habit) => habit.scheduled > 0)
    .sort((a, b) => b.rate - a.rate || b.completed - a.completed);
  const bestHabit = ranked[0] ?? null;
  const worstHabit = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const currentStreak = Math.max(0, ...habitStats.map((habit) => habit.currentStreak));
  const longestStreak = Math.max(0, ...habitStats.map((habit) => habit.longestStreak));
  const activeDays = daily.filter((day) => day.completed > 0).length;
  const perfectDays = daily.filter(
    (day) => day.scheduled > 0 && day.completed === day.scheduled,
  ).length;

  const summary: StatsSummaryDTO = {
    scheduled,
    completed,
    partial,
    missed,
    rate: scheduled > 0 ? completed / scheduled : 0,
    completedToday: todayRows.filter(isCompleted).length,
    scheduledToday: todayRows.length,
    currentStreak,
    longestStreak,
    timerMinutes: Math.round(
      rows.reduce((sum, row) => sum + row.timerMs, 0) / 60_000,
    ),
    activeDays,
    perfectDays,
    totalHabits: habits.filter((habit) => habit.status !== "archived").length,
  };

  return {
    range: { from, to, days: eachDay(from, to).length },
    summary,
    daily,
    weekly,
    monthly,
    yearly,
    habits: habitStats,
    categories,
    heatmap,
    bestHabit,
    worstHabit,
  };
}

/** Returns recent activity for the dashboard. */
export async function loadRecentActivity(
  userId: string,
  timezone: string,
): Promise<ActivityItemDTO[]> {
  const today = todayKey(timezone);
  return loadActivity(userId, addDays(today, -30));
}

/**
 * Utility used by tests: returns the weekday order for a week-start setting.
 */
export function orderedWeekdays(weekStartsOn: number): number[] {
  return weekdayOrder(weekStartsOn);
}
