/**
 * src/lib/auth.ts
 * ---------------------------------------------------------------------------
 * Authentication and session management.
 *
 * HOW THE LOGIN SYSTEM WORKS
 * ---------------------------
 * 1. The user signs up with an e-mail address and a password. The password
 *    is hashed with bcrypt (a deliberately slow one-way function) and only
 *    the hash is stored.
 * 2. On a successful sign-in a random 32-byte token is generated. The raw
 *    token is placed in an httpOnly cookie; only its SHA-256 hash is stored
 *    in the `Session` table.
 * 3. Every protected request looks the cookie up in the `Session` table.
 *    Because each device/browser gets its **own** session row, a person can
 *    be signed in on a phone and a laptop at the same time, and can revoke
 *    any single device from the settings screen.
 * 4. Signing out deletes that device's session row.
 */

import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./db";

/** Name of the cookie that stores the session token. */
export const SESSION_COOKIE_NAME = "ht_session";

/** How long a session stays valid, in seconds (30 days). */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** Number of bcrypt rounds. 10 is the usual balance between speed and safety. */
const BCRYPT_ROUNDS = 10;

/** Minimum acceptable password length. */
export const MIN_PASSWORD_LENGTH = 8;

/** The user object as it is handed to client components — never includes the
 * password hash. */
export type SafeUser = Omit<User, "passwordHash">;

/**
 * Hashes a plain-text password with bcrypt.
 *
 * @param password The plain-text password.
 * @returns The bcrypt hash, safe to store in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

/**
 * Checks a plain-text password against a stored bcrypt hash.
 *
 * @param password     The plain-text password typed by the user.
 * @param passwordHash The stored hash.
 * @returns `true` when the password matches.
 */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

/**
 * Creates a random, URL-safe session token.
 *
 * @returns 43 characters of base64url randomness (256 bits of entropy).
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hashes a session token for storage.
 *
 * @param token The raw token from the cookie.
 * @returns The hex SHA-256 digest.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Removes the password hash (and nothing else) from a user record.
 *
 * @param user The raw user record.
 * @returns A version that is safe to send to the browser.
 */
export function sanitizeUser(user: User): SafeUser {
  const safe = { ...user };
  delete (safe as Partial<User>).passwordHash;
  return safe;
}

/**
 * Derives a friendly device name from a User-Agent header.
 *
 * @param userAgent The raw User-Agent string.
 * @returns Something like "Chrome on Windows".
 */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : "Browser";
  const platform = /Windows/.test(userAgent)
    ? "Windows"
    : /Android/.test(userAgent)
      ? "Android"
      : /iPhone|iPad|iPod/.test(userAgent)
        ? "iOS"
        : /Mac OS X/.test(userAgent)
          ? "macOS"
          : /Linux/.test(userAgent)
            ? "Linux"
            : "Unknown OS";
  return `${browser} on ${platform}`;
}

/**
 * Reads request metadata (User-Agent and IP) for the devices list.
 *
 * @returns `{ userAgent, ipAddress }`.
 */
async function readRequestMeta(): Promise<{ userAgent: string | null; ipAddress: string | null }> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return {
    userAgent: headerList.get("user-agent"),
    ipAddress: forwarded ? forwarded.split(",")[0].trim() : headerList.get("x-real-ip"),
  };
}

/**
 * Creates a session row for a user and returns the raw token.
 *
 * The caller is responsible for putting the token into the cookie.
 *
 * @param userId The user the session belongs to.
 * @returns `{ token, session }` — `token` is the secret, `session` the row.
 */
export async function createSession(userId: string) {
  const meta = await readRequestMeta();
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      tokenHash: hashSessionToken(token),
      userId,
      deviceLabel: describeDevice(meta.userAgent),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    },
  });

  return { token, session };
}

/**
 * Writes the session token into the response cookie.
 *
 * Only callable from a Server Action or Route Handler.
 *
 * @param token The raw session token.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Removes the session cookie from the browser.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Returns the raw session token from the request cookie.
 *
 * @returns The token, or `null` when the visitor is not signed in.
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * Resolves the currently signed-in user.
 *
 * @returns `{ user, session }` when signed in, otherwise `null`.
 */
export async function getCurrentUser(): Promise<{ user: User; session: { id: string } } | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const tokenHash = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  // Only touch the database once in a while so we do not write on every read.
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return { user: session.user, session: { id: session.id } };
}

/**
 * Like {@link getCurrentUser} but redirects to the sign-in page when the
 * visitor is not authenticated. Use this in server components that must be
 * protected.
 *
 * @param redirectTo Where to send the user after signing in.
 * @returns The signed-in user.
 */
export async function requireUser(redirectTo = "/login"): Promise<User> {
  const current = await getCurrentUser();
  if (!current) {
    redirect(`${redirectTo}`);
  }
  return current.user;
}

/**
 * Deletes the session belonging to the current request.
 */
export async function destroyCurrentSession(): Promise<void> {
  const token = await getSessionToken();
  if (!token) return;
  await prisma.session
    .deleteMany({ where: { tokenHash: hashSessionToken(token) } })
    .catch(() => undefined);
  await clearSessionCookie();
}

/**
 * Lists every active session of a user (one row per signed-in device).
 *
 * @param userId The user whose sessions to list.
 * @returns The session rows, newest activity first.
 */
export async function listUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { lastSeenAt: "desc" },
  });
}

/**
 * Signs a user out of every device.
 *
 * @param userId The user whose sessions should all end.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/* --------------------------------------------------------------------------
 * Password reset
 * ----------------------------------------------------------------------- */

/**
 * Creates a single-use password-reset token.
 *
 * The raw token is returned to the caller (to be placed in an e-mail link);
 * only its SHA-256 hash is stored. Tokens expire after one hour.
 *
 * @param userId The account that requested the reset.
 * @returns The raw token and its expiry.
 */
export async function createPasswordResetToken(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });

  return { token, expiresAt };
}

/**
 * Validates and consumes a password-reset token.
 *
 * The token is marked as used before the password is changed, so replaying
 * the same link cannot reset the account twice.
 *
 * @param token The raw token from the reset link.
 * @returns The user id, or `null` when the token is invalid/expired/used.
 */
export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  if (!token || token.length < 20) return null;
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;

  await prisma.passwordResetToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  return row.userId;
}

/**
 * Sends an authenticated visitor to the dashboard. Used by the auth pages.
 */
export async function requireGuest(): Promise<void> {
  const current = await getCurrentUser();
  if (current) redirect("/dashboard");
}
