import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  routeError,
  unauthorized,
} from "@/lib/api";
import { removeHabit, updateHabit } from "@/lib/habit-service";
import { firstErrorMessage, habitPatchSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const parsed = habitPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const result = await updateHabit(
      auth.user.id,
      auth.user.timezone,
      id,
      parsed.data,
    );
    return apiOk(result);
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";

  try {
    const result = await removeHabit(
      auth.user.id,
      auth.user.timezone,
      id,
      permanent,
    );
    return apiOk(result);
  } catch (error) {
    return routeError(error);
  }
}
