/**
 * src/lib/rate-limit.ts
 * ---------------------------------------------------------------------------
 * A tiny in-memory rate limiter.
 *
 * It protects the sign-in and sign-up endpoints against brute-force attempts.
 * The counters live in the memory of the running server process, which is
 * enough for a single-instance deployment (the usual case for this app). On
 * a multi-instance host you would move the counters into Redis — the
 * interface below is intentionally small so that swap is easy.
 */

/** One tracked counter. */
interface Bucket {
  /** Number of requests seen inside the current window. */
  count: number;
  /** Moment the current window ends (epoch milliseconds). */
  resetAt: number;
}

/** All buckets, keyed by "<action>:<identifier>". */
const buckets = new Map<string, Bucket>();

/** How long a window lasts, in milliseconds. */
const WINDOW_MS = 15 * 60 * 1000;

/** How many requests are allowed per window per action. */
const LIMITS: Record<string, number> = {
  register: 5,
  login: 10,
};

/**
 * Extracts the caller's IP address from the request headers.
 *
 * @param request The incoming request.
 * @returns The IP address, or "unknown".
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Checks whether a request is allowed to proceed.
 *
 * @param action  The bucket name, e.g. "login".
 * @param request The incoming request, used to find the caller.
 * @returns `{ allowed, message, remaining }`.
 */
export async function checkRateLimit(
  action: string,
  request: Request,
): Promise<{ allowed: boolean; message: string; remaining: number }> {
  const limit = LIMITS[action] ?? 20;
  const key = `${action}:${clientIp(request)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, message: "", remaining: limit - 1 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    const minutes = Math.max(1, Math.ceil((bucket.resetAt - now) / 60000));
    return {
      allowed: false,
      message: `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      remaining: 0,
    };
  }

  return { allowed: true, message: "", remaining: limit - bucket.count };
}
