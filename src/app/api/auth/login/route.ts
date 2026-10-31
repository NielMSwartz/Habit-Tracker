import { prisma } from "@/lib/db";
import { apiError, apiOk, crossOrigin, forbidCrossOrigin } from "@/lib/api";
import {
  createSession,
  sanitizeUser,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { firstErrorMessage, loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const limit = await checkRateLimit("login", request);
  if (!limit.allowed) return apiError(limit.message, 429);

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return apiError("E-mail or password is incorrect.", 401);
  }

  const { token } = await createSession(user.id);
  await setSessionCookie(token);
  return apiOk({ user: sanitizeUser(user) });
}
