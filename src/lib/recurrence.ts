/**
 * The recurrence engine.
 *
 * A single pure function (`habitOccursOn`) answers "is this habit scheduled on
 * this day?" for the dashboard, calendar, analytics and reminders. The other
 * helpers in this file are built on top of it, so those screens can never
 * disagree about a schedule.
 */

import {
  addDays,
  dayOfMonth,
  daysBetween,
  daysInMonth,
  eachDay,
  formatDateLabel,
  monthOf,
  startOfWeek,
  weekdayOf,
  yearOf,
  WEEKDAY_NAMES,
} from "./dates";

export type HabitFrequency =
  | "once"
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "yearly";

export const FREQUENCIES: readonly HabitFrequency[] = [
  "once",
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
] as const;

export interface Schedule {
  frequency: HabitFrequency;
  interval: number;
  weekdays: number[];
  monthDays: number[];
  startDate: string;
  endDate: string | null;
}

/** The raw habit columns needed to build a schedule. */
export interface ScheduleSource {
  frequency: string;
  interval: number;
  weekdays: string;
  monthDays: string;
  startDate: string;
  endDate: string | null;
}

/** Parses a JSON number list without ever throwing. */
export function parseNumberList(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
  } catch {
    return [];
  }
}

/** Serialises a number list as sorted, de-duplicated JSON. */
export function serializeNumberList(values: number[]): string {
  return JSON.stringify([...new Set(values)].sort((a, b) => a - b));
}

/** Repairs a raw habit row into a valid schedule. */
export function normalizeSchedule(habit: ScheduleSource): Schedule {
  const frequency = (FREQUENCIES as readonly string[]).includes(habit.frequency)
    ? (habit.frequency as HabitFrequency)
    : "daily";
  const interval =
    Number.isFinite(habit.interval) && habit.interval >= 1
      ? Math.floor(habit.interval)
      : 1;
  const weekdays = parseNumberList(habit.weekdays)
    .filter((day) => day >= 0 && day <= 6)
    .sort((a, b) => a - b);
  const monthDays = parseNumberList(habit.monthDays)
    .filter((day) => day >= 1 && day <= 31)
    .sort((a, b) => a - b);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(habit.startDate)
    ? habit.startDate
    : "1970-01-01";
  const endDate =
    habit.endDate && habit.endDate >= startDate ? habit.endDate : null;

  return { frequency, interval, weekdays, monthDays, startDate, endDate };
}

function occursOnMonthDay(dateKey: string, monthDays: number[]): boolean {
  if (monthDays.length === 0) return dayOfMonth(dateKey) === 1;
  const day = dayOfMonth(dateKey);
  const last = daysInMonth(yearOf(dateKey), monthOf(dateKey));
  return monthDays.some((rule) =>
    rule > last ? day === last : day === rule,
  );
}

/** The effective weekdays of a weekly schedule. */
export function scheduleWeekdays(schedule: Schedule): number[] {
  if (schedule.frequency === "weekdays") return [1, 2, 3, 4, 5];
  if (schedule.weekdays.length > 0) return schedule.weekdays;
  return [weekdayOf(schedule.startDate)];
}

/** Decides whether a habit is scheduled on a day. */
export function habitOccursOn(schedule: Schedule, dateKey: string): boolean {
  if (dateKey < schedule.startDate) return false;
  if (schedule.endDate && dateKey > schedule.endDate) return false;

  switch (schedule.frequency) {
    case "once":
      return dateKey === schedule.startDate;

    case "daily": {
      const elapsed = daysBetween(schedule.startDate, dateKey);
      return elapsed >= 0 && elapsed % schedule.interval === 0;
    }

    case "weekdays":
    case "weekly": {
      const days = scheduleWeekdays(schedule);
      if (!days.includes(weekdayOf(dateKey))) return false;
      const weeks = Math.round(
        daysBetween(
          startOfWeek(schedule.startDate, 1),
          startOfWeek(dateKey, 1),
        ) / 7,
      );
      return weeks >= 0 && weeks % schedule.interval === 0;
    }

    case "monthly": {
      if (!occursOnMonthDay(dateKey, schedule.monthDays)) return false;
      const months =
        (yearOf(dateKey) - yearOf(schedule.startDate)) * 12 +
        (monthOf(dateKey) - monthOf(schedule.startDate));
      return months >= 0 && months % schedule.interval === 0;
    }

    case "yearly": {
      const years = yearOf(dateKey) - yearOf(schedule.startDate);
      if (years < 0 || years % schedule.interval !== 0) return false;
      if (monthOf(dateKey) !== monthOf(schedule.startDate)) return false;
      const targetDay = Math.min(
        dayOfMonth(schedule.startDate),
        daysInMonth(yearOf(dateKey), monthOf(dateKey)),
      );
      return dayOfMonth(dateKey) === targetDay;
    }

    default:
      return false;
  }
}

/** Lists every scheduled day between two date keys (inclusive). */
export function expandOccurrences(
  schedule: Schedule,
  from: string,
  to: string,
): string[] {
  if (to < from) return [];
  const start = schedule.startDate > from ? schedule.startDate : from;
  const end = schedule.endDate && schedule.endDate < to ? schedule.endDate : to;
  if (end < start) return [];
  return eachDay(start, end).filter((date) => habitOccursOn(schedule, date));
}

/** Finds the next scheduled day on or after a date. */
export function nextOccurrence(
  schedule: Schedule,
  afterKey: string,
  horizon = 800,
): string | null {
  if (schedule.endDate && afterKey > schedule.endDate) return null;
  const from = afterKey < schedule.startDate ? schedule.startDate : afterKey;
  const end = addDays(from, horizon);
  const candidates = expandOccurrences(schedule, from, end);
  return candidates[0] ?? null;
}

/** Counts scheduled occurrences in a range. */
export function countOccurrences(
  schedule: Schedule,
  from: string,
  to: string,
): number {
  return expandOccurrences(schedule, from, to).length;
}

/** Turns a number into an English ordinal. */
export function ordinal(value: number): string {
  const ten = value % 10;
  const hundred = value % 100;
  if (ten === 1 && hundred !== 11) return `${value}st`;
  if (ten === 2 && hundred !== 12) return `${value}nd`;
  if (ten === 3 && hundred !== 13) return `${value}rd`;
  return `${value}th`;
}

/** Builds a friendly schedule description. */
export function describeSchedule(schedule: Schedule): string {
  const { frequency, interval } = schedule;
  const every = (unit: string) =>
    interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;

  switch (frequency) {
    case "once":
      return `Once on ${formatDateLabel(schedule.startDate)}`;
    case "daily":
      return interval === 1 ? "Every day" : `Every ${interval} days`;
    case "weekdays":
      return interval === 1
        ? "Every weekday"
        : `Every ${interval} weeks on weekdays`;
    case "weekly": {
      const days = scheduleWeekdays(schedule)
        .map((day) => WEEKDAY_NAMES[day].slice(0, 3))
        .join(", ");
      return `${every("week")} on ${days}`;
    }
    case "monthly": {
      const days =
        schedule.monthDays.length > 0
          ? schedule.monthDays.map((day) => ordinal(day)).join(", ")
          : ordinal(dayOfMonth(schedule.startDate));
      return `${every("month")} on the ${days}`;
    }
    case "yearly":
      return `${every("year")} on ${formatDateLabel(schedule.startDate, { short: true })}`;
    default:
      return "Unknown schedule";
  }
}

/** A short label for the frequency selector. */
export function frequencyLabel(frequency: HabitFrequency): string {
  switch (frequency) {
    case "once":
      return "One-off";
    case "daily":
      return "Daily";
    case "weekdays":
      return "Weekdays";
    case "weekly":
      return "Weekly";
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
  }
}

/** A map of scheduled dates, used by calendars and tests. */
export function scheduleMap(
  schedule: Schedule,
  from: string,
  to: string,
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const date of expandOccurrences(schedule, from, to)) map[date] = true;
  return map;
}
