import { prisma } from "@/lib/db";
import { apiError, apiOk, crossOrigin, forbidCrossOrigin } from "@/lib/api";
import { createPasswordResetToken } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { firstErrorMessage, forgotPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const limit = await checkRateLimit("forgot", request);
  if (!limit.allowed) return apiError(limit.message, 429);

  const parsed = forgotPasswordSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  let devUrl: string | undefined;
  if (user) {
    const { token } = await createPasswordResetToken(user.id);
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
    const result = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
    });
    devUrl = result.fallbackUrl;
  }

  return apiOk({
    message:
      "If an account exists for that e-mail, a reset link is on its way. Check your inbox and spam folder.",
    ...(devUrl ? { devUrl } : {}),
  });
}
