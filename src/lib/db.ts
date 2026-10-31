import { PrismaClient } from "@prisma/client";

/**
 * Shared Prisma client.
 *
 * Next.js hot-reloads server modules in development. Without the global
 * cache below every reload would open a brand new connection pool, which
 * quickly exhausts the database's connection limit. The `globalThis` cache
 * keeps one client alive per process in both dev and production.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The Prisma client used by every server-side module.
 * @type {PrismaClient}
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Friendly logging in development makes mistakes obvious in the terminal.
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Prisma error codes we handle explicitly. Anything else is re-thrown.
 * @type {readonly string[]}
 */
export const KNOWN_PRISMA_ERROR_CODES = ["P2002", "P2025"] as const;

/**
 * Converts a Prisma error into a message that is safe to show in the UI.
 *
 * @param unknown error The thrown value.
 * @returns {string} A human readable, non-leaky message.
 */
export function describePrismaError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;
    if (code === "P2002") {
      return "That value is already taken.";
    }
    if (code === "P2025") {
      return "That record no longer exists.";
    }
  }
  return "Something went wrong. Please try again.";
}
