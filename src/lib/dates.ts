/**
 * src/lib/dates.ts
 * ---------------------------------------------------------------------------
 * Calendar helpers.
 *
 * DESIGN RULE: a "day" in this app is a plain string in "YYYY-MM-DD" format.
 * Every date calculation is done on UTC-anchored `Date` objects so that the
 * result never depends on the machine's timezone or on daylight saving
 * time. The only place a real timezone matters is when a timestamp has to be
 * converted into "what day is it for this user" — that lives in
 * `src/lib/tz.ts`.
 */

/** Number of milliseconds in one day. */
export const MS_PER_DAY = 86_400_000;

/** Number of milliseconds in one minute. */
export const MS_PER_MINUTE = 60_000;

/** Names of the seven weekdays, indexed the same way as `Date.getDay()`. */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Short weekday labels used in the UI (Monday first, as in most calendars). */
export const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"] as const;

/**
 * Formats a `Date` as a "YYYY-MM-DD" string using its **UTC** fields.
 *
 * @param date The date to format.
 * @returns The date as "YYYY-MM-DD".
 */
export function toDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a "YYYY-MM-DD" string into a `Date` anchored at UTC midnight.
 *
 * @param key A "YYYY-MM-DD" string.
 * @returns The corresponding UTC-midnight `Date` (invalid input → invalid Date).
 */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map((part) => Number(part));
  return new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
}

/**
 * Returns today's date key for a given instant in a given IANA timezone.
 *
 * @param timezone An IANA timezone name, e.g. "Europe/Amsterdam".
 * @param now       The instant to convert. Defaults to the current time.
 * @returns The local "YYYY-MM-DD" string for that instant.
 */
export function todayKey(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * Adds a number of days to a date key.
 *
 * @param key   The starting "YYYY-MM-DD" string.
 * @param days  Number of days to add (may be negative).
 * @returns The resulting "YYYY-MM-DD" string.
 */
export function addDays(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

/**
 * Adds a number of months to a date key.
 *
 * The day-of-month is clamped to the length of the target month, so
 * "31 Jan + 1 month" becomes "28 Feb" (or "29 Feb" in a leap year) instead
 * of rolling over into March.
 *
 * @param key    The starting "YYYY-MM-DD" string.
 * @param months Number of months to add (may be negative).
 * @returns The resulting "YYYY-MM-DD" string.
 */
export function addMonths(key: string, months: number): string {
  const date = fromDateKey(key);
  const targetMonth = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month + 1));
  return toDateKey(new Date(Date.UTC(year, month, day)));
}

/**
 * Adds a number of years to a date key, clamping 29 Feb onto 28 Feb in
 * non-leap years.
 *
 * @param key   The starting "YYYY-MM-DD" string.
 * @param years Number of years to add (may be negative).
 * @returns The resulting "YYYY-MM-MM-DD" string.
 */
export function addYears(key: string, years: number): string {
  const date = fromDateKey(key);
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = Math.min(date.getUTCDate(), daysInMonth(year, month + 1));
  return toDateKey(new Date(Date.UTC(year, month, day)));
}

/**
 * Returns the number of days in a month.
 *
 * @param year  The calendar year.
 * @param month The calendar month, 1 = January … 12 = December.
 * @returns 28, 29, 30 or 31.
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Returns the weekday index of a date key.
 *
 * @param key A "YYYY-MM-DD" string.
 * @returns 0 = Sunday … 6 = Saturday.
 */
export function weekdayOf(key: string): number {
  return fromDateKey(key).getUTCDay();
}

/**
 * Returns the day-of-month of a date key.
 *
 * @param key A "YYYY-MM-DD" string.
 * @returns 1 … 31.
 */
export function dayOfMonth(key: string): number {
  return fromDateKey(key).getUTCDate();
}

/**
 * Returns the month number of a date key.
 *
 * @param key A "YYYY-MM-DD" string.
 * @returns 1 = January … 12 = December.
 */
export function monthOf(key: string): number {
  return fromDateKey(key).getUTCMonth() + 1;
}

/**
 * Returns the year of a date key.
 *
 * @param key A "YYYY-MM-DD" string.
 * @returns The four digit year.
 */
export function yearOf(key: string): number {
  return fromDateKey(key).getUTCFullYear();
}

/**
 * Returns the first day of the month that contains the given date key.
 *
 * @param key Any "YYYY-MM-DD" string.
 * @returns The "YYYY-MM-01" string of that month.
 */
export function startOfMonth(key: string): string {
  return `${yearOf(key)}-${String(monthOf(key)).padStart(2, "0")}-01`;
}

/**
 * Returns the last day of the month that contains the given date key.
 *
 * @param key Any "YYYY-MM-DD" string.
 * @returns The last "YYYY-MM-DD" string of that month.
 */
export function endOfMonth(key: string): string {
  const year = yearOf(key);
  const month = monthOf(key);
  return `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`;
}

/**
 * Returns the number of days between two date keys (`to` minus `from`).
 *
 * @param from The earlier date key.
 * @param to   The later date key.
 * @returns The difference in days (negative when `to` is earlier).
 */
export function daysBetween(from: string, to: string): number {
  return Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / MS_PER_DAY);
}

/**
 * Builds a list of consecutive date keys, inclusive on both ends.
 *
 * @param from The first date key.
 * @param to   The last date key.
 * @returns Every date key between `from` and `to` (empty when `to < from`).
 */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const total = daysBetween(from, to);
  if (total < 0) return days;
  for (let index = 0; index <= total; index += 1) {
    days.push(addDays(from, index));
  }
  return days;
}

/**
 * Formats a "YYYY-MM-DD" key for display, e.g. "Mon 21 Oct".
 *
 * @param key  The date key.
 * @param options.short When true only shows the day and month.
 * @returns A short human readable date.
 */
export function formatDateLabel(key: string, options: { short?: boolean } = {}): string {
  const date = fromDateKey(key);
  const day = date.getUTCDate();
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  if (options.short) return `${day} ${month}`;
  const weekday = date.toLocaleString("en-US", { weekday: "short", timeZone: "UTC" });
  return `${weekday} ${day} ${month}`;
}

/**
 * Formats a minute count as "HH:MM:SS" (or "MM:SS" when under an hour).
 *
 * @param totalSeconds The number of seconds to format.
 * @returns The formatted clock string.
 */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Parses a "HH:MM" string into minutes past midnight.
 *
 * @param time The time string, e.g. "08:30".
 * @returns The number of minutes, or `null` when the input is invalid.
 */
export function parseTimeOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Formats minutes past midnight as "HH:MM".
 *
 * @param minutes Minutes past midnight.
 * @returns The formatted time string.
 */
export function formatTimeOfDay(minutes: number): string {
  const normalised = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalised / 60);
  const mins = normalised % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Returns the local "HH:MM" time for an instant in a given timezone.
 *
 * @param timezone An IANA timezone name.
 * @param now      The instant to convert. Defaults to the current time.
 * @returns The local time as "HH:MM".
 */
export function localTimeOfDay(timezone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
}

/**
 * Returns the start and end keys of the 7×6 grid a month calendar needs.
 *
 * The grid starts on the Sunday on or before the 1st of the month and ends on
 * the Saturday on or after the last day of the month.
 *
 * @param monthKey Any date key inside the month to render.
 * @returns `{ start, end }` date keys for the calendar grid.
 */
export function calendarGridRange(monthKey: string): { start: string; end: string } {
  const first = startOfMonth(monthKey);
  const last = endOfMonth(monthKey);
  const leading = weekdayOf(first);
  const trailing = 6 - weekdayOf(last);
  return { start: addDays(first, -leading), end: addDays(last, trailing) };
}

/**
 * Returns the first day of the week containing a date.
 *
 * @param key         Any "YYYY-MM-DD" date.
 * @param weekStartsOn 0 for Sunday, 1 for Monday. Defaults to Monday.
 * @returns The date key of that week's first day.
 */
export function startOfWeek(key: string, weekStartsOn = 1): string {
  const offset = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -offset);
}

/**
 * Returns the last day of the week containing a date.
 *
 * @param key         Any "YYYY-MM-DD" date.
 * @param weekStartsOn 0 for Sunday, 1 for Monday.
 * @returns The date key of that week's last day.
 */
export function endOfWeek(key: string, weekStartsOn = 1): string {
  return addDays(startOfWeek(key, weekStartsOn), 6);
}

/**
 * Returns the seven weekday indices in display order.
 *
 * @param weekStartsOn 0 for Sunday, 1 for Monday.
 * @returns An array such as [1, 2, 3, 4, 5, 6, 0].
 */
export function weekdayOrder(weekStartsOn = 1): number[] {
  const start = weekStartsOn === 0 ? 0 : 1;
  return Array.from({ length: 7 }, (_, index) => (start + index) % 7);
}

/** Short weekday names indexed like Date.getDay(). */
export const WEEKDAY_TINY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/**
 * Formats a date key as a long, friendly date, e.g. "Wednesday, 28 October 2026".
 *
 * @param key The date key.
 * @returns The formatted date.
 */
export function formatLongDate(key: string): string {
  return fromDateKey(key).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Formats a date key as "October 2026".
 *
 * @param key Any date inside the month.
 * @returns The month label.
 */
export function formatMonthLabel(key: string): string {
  return fromDateKey(key).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Returns "Today", "Yesterday", "Tomorrow" or a formatted date.
 *
 * @param key   The date to describe.
 * @param today Today's date key in the user's timezone.
 * @returns A human friendly relative label.
 */
export function relativeDayLabel(key: string, today: string): string {
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  if (key === addDays(today, 1)) return "Tomorrow";
  return formatDateLabel(key);
}

/**
 * Tests whether a string is a real calendar date in "YYYY-MM-DD" form.
 * Rejects impossible dates such as 2026-02-31.
 *
 * @param value The value to test.
 * @returns `true` for a valid date key.
 */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = fromDateKey(value);
  return toDateKey(date) === value;
}

/**
 * Tests whether a string is a valid IANA timezone name.
 *
 * @param timezone The value to test.
 * @returns `true` when Intl accepts it.
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the number of whole days in a year.
 *
 * @param year The year.
 * @returns 365 or 366.
 */
export function daysInYear(year: number): number {
  return daysInMonth(year, 2) === 29 ? 366 : 365;
}

/**
 * NaN-safe numeric clamp.
 *
 * @param value The value to clamp.
 * @param min   Lower bound.
 * @param max   Upper bound.
 * @returns The clamped number.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
