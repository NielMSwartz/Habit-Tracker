import { prisma } from "@/lib/db";
import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  routeError,
} from "@/lib/api";
import {
  createSession,
  hashPassword,
  sanitizeUser,
  setSessionCookie,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { firstErrorMessage, registerSchema } from "@/lib/validation";

/** True when Prisma rejected the write because a unique column was taken. */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const limit = await checkRateLimit("register", request);
  if (!limit.allowed) return apiError(limit.message, 429);

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);
  const { name, email, password } = parsed.data;

  // The database work lives inside the try block so an unreachable database or
  // a missing table produces a JSON error the client can display, instead of an
  // unhandled exception and a bare "Request failed (500)." in the UI.
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("An account with that e-mail already exists.", 409);
    }

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
  } catch (error) {
    // Two simultaneous sign-ups for the same address can race past the lookup
    // above; the unique index still catches it, and it stays a friendly 409.
    if (isUniqueConstraintError(error)) {
      return apiError("An account with that e-mail already exists.", 409);
    }
    return routeError(error);
  }
}
