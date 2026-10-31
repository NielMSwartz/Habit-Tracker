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
import { toHabitDTO } from "@/lib/habits";
import { createHabit } from "@/lib/habit-service";
import { firstErrorMessage, habitInputSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const habits = await prisma.habit.findMany({
    where: { userId: auth.user.id },
    include: { steps: true, category: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return apiOk(habits.map(toHabitDTO));
}

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = habitInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const habit = await createHabit(auth.user.id, auth.user.timezone, parsed.data);
    return apiOk(habit, 201);
  } catch (error) {
    return routeError(error);
  }
}
