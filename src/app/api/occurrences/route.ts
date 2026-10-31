import { z } from "zod";
import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  routeError,
  unauthorized,
} from "@/lib/api";
import { addOccurrence } from "@/lib/habits";
import { dateKeySchema, firstErrorMessage } from "@/lib/validation";

const schema = z.object({
  habitId: z.string().min(1),
  date: dateKeySchema,
});

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const occurrence = await addOccurrence(
      auth.user.id,
      parsed.data.habitId,
      parsed.data.date,
    );
    return apiOk(occurrence, 201);
  } catch (error) {
    return routeError(error);
  }
}
