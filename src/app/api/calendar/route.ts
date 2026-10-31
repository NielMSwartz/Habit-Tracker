import { apiError, apiOk, requireApiUser, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  daysBetween,
  eachDay,
  isDateKey,
  startOfMonth,
  endOfMonth,
  todayKey,
} from "@/lib/dates";
import { loadOccurrences } from "@/lib/habits";
import { toTaskDTO } from "@/lib/serialize";
import type { CalendarDTO } from "@/lib/types";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const today = todayKey(auth.user.timezone);
  const defaultFrom = startOfMonth(today);
  const defaultTo = endOfMonth(today);
  const from = url.searchParams.get("from") ?? defaultFrom;
  const to = url.searchParams.get("to") ?? defaultTo;

  if (!isDateKey(from) || !isDateKey(to)) {
    return apiError("Use YYYY-MM-DD dates for the calendar range.", 422);
  }
  if (to < from) return apiError("The end date must not precede the start date.", 422);
  if (daysBetween(from, to) > 400) {
    return apiError("Choose a range of 400 days or fewer.", 422);
  }

  const [occurrences, tasks] = await Promise.all([
    loadOccurrences(auth.user.id, from, to),
    prisma.task.findMany({
      where: {
        userId: auth.user.id,
        date: { gte: from, lte: to },
      },
      include: { category: { select: { name: true } } },
      orderBy: [{ time: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const taskDTOs = tasks.map(toTaskDTO);
  const days = eachDay(from, to).map((date) => ({
    date,
    occurrences: occurrences.filter((occurrence) => occurrence.date === date),
    tasks: taskDTOs.filter((task) => task.date === date),
  }));

  const payload: CalendarDTO = { from, to, days };
  return apiOk(payload);
}
