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
import { firstErrorMessage, taskInputSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const tasks = await prisma.task.findMany({
    where: {
      userId: auth.user.id,
      ...(from ? { date: { gte: from } } : {}),
      ...(to ? { date: { lte: to } } : {}),
    },
    include: { category: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });
  return apiOk(tasks.map(toTaskDTO));
}

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = taskInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.data.categoryId, userId: auth.user.id },
      });
      if (!category) return apiError("That category was not found.", 404);
    }

    const task = await prisma.task.create({
      data: {
        userId: auth.user.id,
        title: parsed.data.title,
        notes: parsed.data.notes ?? null,
        date: parsed.data.date,
        time: parsed.data.time ?? null,
        hue: parsed.data.hue,
        categoryId: parsed.data.categoryId ?? null,
      },
      include: { category: { select: { name: true } } },
    });
    return apiOk(toTaskDTO(task), 201);
  } catch (error) {
    return routeError(error);
  }
}
