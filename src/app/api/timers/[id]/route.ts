import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  routeError,
  unauthorized,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { actOnTimer } from "@/lib/habits";
import { firstErrorMessage, timerActionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const parsed = timerActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    return apiOk(
      await actOnTimer({
        userId: auth.user.id,
        timerId: id,
        action: parsed.data.action,
      }),
    );
  } catch (error) {
    return routeError(error);
  }
}

/** Removes a timer the user has reset. Completed timers keep their credit. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const timer = await prisma.timerSession.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!timer) return apiError("That timer was not found.", 404);
  if (timer.status === "completed") {
    return apiError(
      "This timer has already been credited. It cannot be removed.",
      409,
    );
  }

  await prisma.timerSession.delete({ where: { id } });
  return apiOk({ deleted: true });
}
