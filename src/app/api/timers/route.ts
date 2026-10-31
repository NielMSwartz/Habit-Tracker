import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  routeError,
  unauthorized,
} from "@/lib/api";
import { loadActiveTimers, startTimer } from "@/lib/habits";
import { firstErrorMessage, timerStartSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  return apiOk(await loadActiveTimers(auth.user.id));
}

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = timerStartSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    return apiOk(await startTimer(auth.user.id, parsed.data.occurrenceId));
  } catch (error) {
    return routeError(error);
  }
}
