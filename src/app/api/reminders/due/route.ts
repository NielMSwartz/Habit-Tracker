import { apiOk, requireApiUser, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  localTimeOfDay,
  parseTimeOfDay,
  todayKey,
} from "@/lib/dates";
import { ensureOccurrences } from "@/lib/habits";
import { habitOccursOn, normalizeSchedule } from "@/lib/recurrence";
import type { ReminderDTO } from "@/lib/types";

function withinQuietHours(
  nowMinutes: number,
  from: string | null,
  until: string | null,
): boolean {
  if (!from || !until) return false;
  const start = parseTimeOfDay(from);
  const end = parseTimeOfDay(until);
  if (start === null || end === null) return false;
  if (start === end) return false;
  return start < end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;
}

/**
 * Returns reminders that are due right now and atomically records their
 * delivery. The unique ReminderLog makes duplicate polls harmless.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id: userId, timezone } = auth.user;

  const settings = await prisma.notificationSetting.findUnique({
    where: { userId },
  });
  if (settings && !settings.inApp && !settings.browser) return apiOk([]);

  const today = todayKey(timezone);
  const nowTime = localTimeOfDay(timezone);
  const nowMinutes = parseTimeOfDay(nowTime) ?? 0;
  if (
    withinQuietHours(
      nowMinutes,
      settings?.quietFrom ?? null,
      settings?.quietUntil ?? null,
    )
  ) {
    return apiOk([]);
  }

  await ensureOccurrences(userId, today, today);

  const habits = await prisma.habit.findMany({
    where: { userId, status: "active", reminderTime: { not: null } },
  });
  if (habits.length === 0) return apiOk([]);

  const due: ReminderDTO[] = [];

  for (const habit of habits) {
    const schedule = normalizeSchedule(habit);
    if (!habitOccursOn(schedule, today)) continue;
    if (!habit.reminderTime) continue;

    const target = Math.max(
      0,
      (parseTimeOfDay(habit.reminderTime) ?? 0) -
        (settings?.reminderLeadMinutes ?? 0),
    );
    // Deliver on time, or late after a reconnect — but not many hours later.
    if (nowMinutes < target || nowMinutes - target > 8 * 60) continue;

    const occurrence = await prisma.occurrence.findFirst({
      where: { userId, habitId: habit.id, date: today },
      include: {
        stepCompletions: true,
        habit: { include: { steps: { where: { active: true, required: true } } } },
      },
    });
    if (occurrence?.status === "completed" || occurrence?.status === "skipped") {
      continue;
    }

    const existing = await prisma.reminderLog.findUnique({
      where: {
        userId_habitId_date_timeOfDay: {
          userId,
          habitId: habit.id,
          date: today,
          timeOfDay: habit.reminderTime,
        },
      },
    });
    if (existing) continue;

    const done = occurrence?.stepCompletions.length ?? 0;
    const total = occurrence?.habit.steps.length ?? 0;
    const message =
      total > 0
        ? `${habit.name} is waiting — ${done}/${total} steps done today.`
        : `It's time for ${habit.name}.`;

    const created = await prisma.reminderLog
      .create({
        data: {
          userId,
          habitId: habit.id,
          date: today,
          timeOfDay: habit.reminderTime,
        },
      })
      .catch(() => null);
    if (!created) continue;

    due.push({
      habitId: habit.id,
      habitName: habit.name,
      hue: habit.hue,
      time: habit.reminderTime,
      date: today,
      message,
    });
  }

  return apiOk(due);
}
