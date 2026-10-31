#!/usr/bin/env node
/**
 * scripts/db-provider.mjs
 * ---------------------------------------------------------------------------
 * Keeps `prisma/schema.prisma` pointed at the right database engine.
 *
 * WHY THIS EXISTS
 * ---------------
 * The app must run in two places:
 *   • locally on a laptop, with zero setup  -> SQLite   (a single file)
 *   • online on Vercel / any host          -> PostgreSQL (a managed database)
 *
 * The Prisma schema is identical in both cases — only the `provider` line in
 * the `datasource` block differs. Instead of keeping two schema files in sync
 * this script rewrites that single line, which means there is exactly one
 * source of truth for the data model.
 *
 * HOW IT WORKS
 * ------------
 * 1. Read the desired provider from the `DATABASE_PROVIDER` environment
 *    variable. Allowed values: "sqlite" (default) and "postgresql".
 * 2. Read the connection string from `DATABASE_URL`. When it is missing we
 *    fall back to a local SQLite file so that `prisma generate` still works
 *    during `npm install`.
 * 3. Replace the `provider = "..."` line inside the `datasource db { ... }`
 *    block of `prisma/schema.prisma`.
 * 4. Export `DATABASE_URL` / `DATABASE_PROVIDER` for the child process and
 *    (optionally) run `prisma generate` so the client matches the provider.
 *
 * USAGE
 * -----
 *   node scripts/db-provider.mjs            # rewrite schema only
 *   node scripts/db-provider.mjs --generate # rewrite + prisma generate
 */

import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Absolute path to the project root (the folder holding package.json). */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Absolute path to the Prisma schema that gets rewritten. */
const SCHEMA_PATH = join(ROOT, "prisma", "schema.prisma");

/** Every database engine this project knows how to target. */
const SUPPORTED_PROVIDERS = ["sqlite", "postgresql"];

/**
 * The provider requested by the environment, defaulting to SQLite so a fresh
 * clone runs without any configuration at all.
 * @type {string}
 */
const requestedProvider = (process.env.DATABASE_PROVIDER || "sqlite").toLowerCase();

if (!SUPPORTED_PROVIDERS.includes(requestedProvider)) {
  console.error(
    `[db-provider] DATABASE_PROVIDER="${requestedProvider}" is not supported. ` +
      `Use one of: ${SUPPORTED_PROVIDERS.join(", ")}.`,
  );
  process.exit(1);
}

/**
 * The connection string. Falls back to a local SQLite file so `prisma
 * generate` can run inside `npm install` before a `.env` exists.
 * @type {string}
 */
const databaseUrl =
  process.env.DATABASE_URL ||
  (requestedProvider === "sqlite" ? "file:./dev.db" : "postgresql://localhost:5432/habit_tracker");

/** The schema exactly as it is on disk right now. */
const originalSchema = readFileSync(SCHEMA_PATH, "utf8");

/**
 * Rewrites the `provider = "..."` entry that lives inside the
 * `datasource db { ... }` block, leaving the rest of the file untouched.
 * @param {string} schema  Full text of schema.prisma.
 * @param {string} provider The new provider name.
 * @returns {string} The updated schema text.
 */
export function rewriteProvider(schema, provider) {
  const datasourceBlock = /datasource\s+db\s*\{[^}]*\}/m;
  const match = schema.match(datasourceBlock);
  if (!match) {
    throw new Error("[db-provider] Could not find a `datasource db { ... }` block.");
  }
  const updatedBlock = match[0].replace(/provider\s*=\s*"[^"]*"/, `provider = "${provider}"`);
  return schema.replace(datasourceBlock, updatedBlock);
}

const nextSchema = rewriteProvider(originalSchema, requestedProvider);

if (nextSchema !== originalSchema) {
  writeFileSync(SCHEMA_PATH, nextSchema, "utf8");
  console.log(`[db-provider] Prisma provider set to "${requestedProvider}".`);
} else {
  console.log(`[db-provider] Prisma provider already "${requestedProvider}".`);
}

/** Environment handed to any child `prisma` process. */
const childEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DATABASE_PROVIDER: requestedProvider,
};

/**
 * Runs `prisma generate` with the correct environment.
 * @returns {void}
 */
function generateClient() {
  const result = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["prisma", "generate"],
    { cwd: ROOT, env: childEnv, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    console.error("[db-provider] `prisma generate` failed.");
    process.exit(result.status ?? 1);
  }
}

if (process.argv.includes("--generate")) {
  generateClient();
}
