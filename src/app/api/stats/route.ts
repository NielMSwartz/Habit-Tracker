import { apiError, apiOk, requireApiUser, unauthorized } from "@/lib/api";
import {
  addDays,
  daysBetween,
  isDateKey,
  todayKey,
} from "@/lib/dates";
import { loadStats } from "@/lib/stats";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const today = todayKey(auth.user.timezone);
  const from = url.searchParams.get("from") ?? addDays(today, -29);
  const to = url.searchParams.get("to") ?? today;
  const habitId = url.searchParams.get("habitId") ?? undefined;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;

  if (!isDateKey(from) || !isDateKey(to)) {
    return apiError("Use YYYY-MM-DD dates for the analytics range.", 422);
  }
  if (to < from) return apiError("The end date must not precede the start date.", 422);
  if (daysBetween(from, to) > 400) {
    return apiError("Choose a range of 400 days or fewer.", 422);
  }

  return apiOk(
    await loadStats(auth.user.id, auth.user.timezone, from, to, {
      habitId,
      categoryId,
    }),
  );
}
