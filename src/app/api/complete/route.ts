import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  routeError,
  unauthorized,
} from "@/lib/api";
import { completeOccurrence } from "@/lib/habits";
import { completeOccurrenceSchema, firstErrorMessage } from "@/lib/validation";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = completeOccurrenceSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const occurrence = await completeOccurrence(
      auth.user.id,
      parsed.data.occurrenceId,
    );
    return apiOk(occurrence);
  } catch (error) {
    return routeError(error);
  }
}
