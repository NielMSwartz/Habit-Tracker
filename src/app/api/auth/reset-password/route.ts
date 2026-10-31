import { prisma } from "@/lib/db";
import { apiError, apiOk, crossOrigin, forbidCrossOrigin } from "@/lib/api";
import {
  clearSessionCookie,
  consumePasswordResetToken,
  hashPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { firstErrorMessage, resetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const limit = await checkRateLimit("reset", request);
  if (!limit.allowed) return apiError(limit.message, 429);

  const parsed = resetPasswordSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) {
    return apiError(
      "This reset link is invalid or has expired. Request a new one.",
      400,
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  // A reset should end every old session, including one an attacker may hold.
  await prisma.session.deleteMany({ where: { userId } });
  await clearSessionCookie();

  return apiOk({ reset: true });
}
