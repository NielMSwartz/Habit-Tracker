import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  routeError,
  unauthorized,
} from "@/lib/api";
import { toggleStep } from "@/lib/habits";
import { firstErrorMessage, stepToggleSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = stepToggleSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const occurrence = await toggleStep({
      userId: auth.user.id,
      occurrenceId: parsed.data.occurrenceId,
      stepId: parsed.data.stepId,
      checked: parsed.data.checked,
    });
    return apiOk(occurrence);
  } catch (error) {
    return routeError(error);
  }
}
