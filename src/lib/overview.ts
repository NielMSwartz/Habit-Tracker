import { prisma } from "./db";
import { addDays, todayKey } from "./dates";
import { loadActiveTimers, loadToday, toHabitDTO } from "./habits";
import { loadRecentActivity, loadStats } from "./stats";
import {
  toCategoryDTO,
  toNotificationDTO,
  toTaskDTO,
  toUserDTO,
} from "./serialize";
import type { OverviewDTO } from "./types";

/**
 * Loads everything the application shell needs in a single request.
 *
 * The payload is small enough to cache for offline use and gives every screen
 * a consistent snapshot of the same account.
 */
export async function loadOverview(
  userId: string,
  timezone: string,
): Promise<OverviewDTO> {
  const today = todayKey(timezone);
  const from = addDays(today, -29);

  const [user, categories, habits, todayRows, timers, todayTasks, upcomingTasks, recent] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { notification: true },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
      prisma.habit.findMany({
        where: { userId },
        include: { steps: true, category: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      loadToday(userId, timezone),
      loadActiveTimers(userId),
      prisma.task.findMany({
        where: { userId, date: today },
        include: { category: { select: { name: true } } },
        orderBy: [{ time: "asc" }, { createdAt: "asc" }],
      }),
      prisma.task.findMany({
        where: { userId, completed: false, date: { gte: today } },
        include: { category: { select: { name: true } } },
        orderBy: [{ date: "asc" }, { time: "asc" }],
        take: 8,
      }),
      loadRecentActivity(userId, timezone),
    ]);

  const stats = await loadStats(userId, timezone, from, today);

  let notification = user.notification;
  if (!notification) {
    notification = await prisma.notificationSetting.create({
      data: { userId },
    });
  }

  return {
    user: toUserDTO(user),
    notifications: toNotificationDTO(notification),
    categories: categories.map(toCategoryDTO),
    habits: habits.map(toHabitDTO),
    today: todayRows,
    timers,
    todayTasks: todayTasks.map(toTaskDTO),
    upcomingTasks: upcomingTasks.map(toTaskDTO),
    stats,
    recent,
    serverNow: new Date().toISOString(),
  };
}
