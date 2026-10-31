import { prisma } from "@/lib/db";
import { apiError, apiOk, crossOrigin, forbidCrossOrigin } from "@/lib/api";
import {
  createSession,
  hashPassword,
  sanitizeUser,
  setSessionCookie,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { firstErrorMessage, registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const limit = await checkRateLimit("register", request);
  if (!limit.allowed) return apiError(limit.message, 429);

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return apiError("An account with that e-mail already exists.", 409);
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        notification: { create: {} },
      },
    });
    const { token } = await createSession(user.id);
    await setSessionCookie(token);
    return apiOk({ user: sanitizeUser(user) }, 201);
  } catch {
    return apiError("An account with that e-mail already exists.", 409);
  }
}
