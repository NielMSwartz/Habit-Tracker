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
 * Human readable text for the Prisma codes that most often break a deployment.
 *
 * These describe *why* the database call failed without revealing credentials,
 * hosts or SQL, which keeps a misconfigured environment diagnosable from the
 * browser instead of only from the host's function logs. The code itself is
 * appended in brackets so it can be searched in Prisma's documentation.
 *
 * @type {Readonly<Record<string, string>>}
 */
const PRISMA_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  P1000: "The server could not sign in to the database.",
  P1001: "The server cannot reach the database.",
  P1002: "The database did not respond in time.",
  P1008: "The database request timed out.",
  P1013: "The database connection string is not valid.",
  P1017: "The database closed the connection.",
  P2002: "That value is already taken.",
  P2021: "The database is missing a required table.",
  P2022: "The database is missing a required column.",
  P2025: "That record no longer exists.",
};

/** Extracts Prisma's `P####` code from a thrown value, if it has one. */
function prismaErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

/**
 * Message fragments Prisma uses for the misconfigurations that break a
 * deployment. Prisma omits the `P####` code on some of these (for example an
 * authentication failure arrives as `PrismaClientInitializationError` with
 * `errorCode: undefined`), so the wording is the only reliable signal.
 *
 * @type {ReadonlyArray<{ pattern: RegExp; message: string }>}
 */
const PRISMA_MESSAGE_HINTS: ReadonlyArray<{ pattern: RegExp; message: string }> = [
  {
    pattern: /authentication failed against database server/i,
    message: "The server could not sign in to the database.",
  },
  {
    pattern: /must start with the protocol `?file:`?/i,
    message:
      "The database engine does not match the connection string. The build generated a SQLite client but DATABASE_URL points at PostgreSQL.",
  },
  {
    pattern: /can't reach database server|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i,
    message: "The server cannot reach the database.",
  },
  {
    pattern: /does not exist in the current database|table .* does not exist/i,
    message: "The database is missing a required table.",
  },
  {
    pattern: /did not initialize yet|prisma client could not be generated/i,
    message: "The database client was not generated during the build.",
  },
];

/**
 * Converts a Prisma error into a message that is safe to show in the UI.
 *
 * @param unknown error The thrown value.
 * @returns {string} A human readable, non-leaky message.
 */
export function describePrismaError(error: unknown): string {
  const code = prismaErrorCode(error);
  if (code) {
    const message = PRISMA_ERROR_MESSAGES[code];
    if (message) return `${message} (${code})`;
    return `Something went wrong. Please try again. (${code})`;
  }

  const text = error instanceof Error ? error.message : "";
  for (const hint of PRISMA_MESSAGE_HINTS) {
    if (hint.pattern.test(text)) return hint.message;
  }

  return "Something went wrong. Please try again.";
}
