import { NextResponse } from "next/server";
import { requireApiUser, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";

/** Downloads every user-owned record as a portable JSON file. */
export async function GET() {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const userId = auth.user.id;

  const [user, categories, habits, occurrences, tasks, timers, sessions] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { notification: true },
      }),
      prisma.category.findMany({ where: { userId } }),
      prisma.habit.findMany({
        where: { userId },
        include: { steps: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.occurrence.findMany({
        where: { userId },
        include: { stepCompletions: true },
        orderBy: { date: "asc" },
      }),
      prisma.task.findMany({ where: { userId }, orderBy: { date: "asc" } }),
      prisma.timerSession.findMany({ where: { userId } }),
      prisma.session.findMany({
        where: { userId },
        select: { id: true, deviceLabel: true, createdAt: true, lastSeenAt: true },
      }),
    ]);

  const payload = {
    app: "Chromatic",
    version: 1,
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      weekStartsOn: user.weekStartsOn,
      theme: user.theme,
      accentHue: user.accentHue,
      defaultCalendarView: user.defaultCalendarView,
      createdAt: user.createdAt,
      notifications: user.notification,
    },
    categories,
    habits,
    occurrences,
    tasks,
    timers,
    signedInDevices: sessions,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="chromatic-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
