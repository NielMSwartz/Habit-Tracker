import { prisma } from "@/lib/db";
import { apiError, apiOk, crossOrigin, forbidCrossOrigin, unauthorized } from "@/lib/api";
import { clearSessionCookie, getCurrentUser, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { deleteAccountSchema, firstErrorMessage } from "@/lib/validation";

export async function DELETE(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const limit = await checkRateLimit("delete-account", request);
  if (!limit.allowed) return apiError(limit.message, 429);

  const parsed = deleteAccountSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  if (!(await verifyPassword(parsed.data.password, current.user.passwordHash))) {
    return apiError("Your password is incorrect.", 401);
  }

  // Cascades remove habits, occurrences, step completions, timers, tasks,
  // categories, sessions and reset tokens. Nothing is left behind.
  await prisma.user.delete({ where: { id: current.user.id } });
  await clearSessionCookie();
  return apiOk({ deleted: true });
}
