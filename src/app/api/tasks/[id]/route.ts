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
import { toTaskDTO } from "@/lib/serialize";
import { firstErrorMessage, taskPatchSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const parsed = taskPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  const existing = await prisma.task.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return apiError("That task was not found.", 404);

  try {
    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.data.categoryId, userId: auth.user.id },
      });
      if (!category) return apiError("That category was not found.", 404);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes } : {}),
        ...(parsed.data.date !== undefined ? { date: parsed.data.date } : {}),
        ...(parsed.data.time !== undefined ? { time: parsed.data.time } : {}),
        ...(parsed.data.hue !== undefined ? { hue: parsed.data.hue } : {}),
        ...(parsed.data.categoryId !== undefined
          ? { categoryId: parsed.data.categoryId }
          : {}),
        ...(parsed.data.completed !== undefined
          ? {
              completed: parsed.data.completed,
              completedAt: parsed.data.completed ? new Date() : null,
            }
          : {}),
      },
      include: { category: { select: { name: true } } },
    });
    return apiOk(toTaskDTO(task));
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

  const result = await prisma.task.deleteMany({
    where: { id, userId: auth.user.id },
  });
  if (result.count === 0) return apiError("That task was not found.", 404);
  return apiOk({ deleted: true });
}
