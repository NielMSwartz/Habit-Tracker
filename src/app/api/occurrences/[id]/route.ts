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
import { actOnOccurrence, getOccurrenceForUser, toOccurrenceDTO } from "@/lib/habits";
import { firstErrorMessage, occurrenceActionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const parsed = occurrenceActionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const occurrence = await actOnOccurrence({
      userId: auth.user.id,
      occurrenceId: id,
      action: parsed.data.action,
      date: parsed.data.date,
      note: parsed.data.note,
    });
    return apiOk(occurrence);
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

  const occurrence = await getOccurrenceForUser(id, auth.user.id);
  if (!occurrence) return apiError("That occurrence was not found.", 404);

  if (occurrence.source === "manual") {
    await prisma.occurrence.delete({ where: { id } });
    return apiOk({ deleted: true });
  }

  // Scheduled occurrences cannot be deleted without the recurrence engine
  // re-creating them. Marking one skipped is the durable "remove this day"
  // action, while the rest of the series and all history stay intact.
  await prisma.occurrence.update({
    where: { id },
    data: { status: "skipped", completedAt: null },
  });
  const updated = await getOccurrenceForUser(id, auth.user.id);
  return apiOk(toOccurrenceDTO(updated!));
}
