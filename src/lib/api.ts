/**
 * src/lib/api.ts
 * ---------------------------------------------------------------------------
 * Shared helpers for the Route Handlers under `src/app/api`.
 *
 * Every endpoint answers with JSON and the same envelope shape:
 *
 * ```json
 * { "ok": true,  "data": { ... } }
 * { "ok": false, "error": "Human readable message." }
 * ```
 *
 * The client can therefore always show `error` directly, and only has to
 * look at `data` when `ok` is true.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { User } from "@prisma/client";

/** The shape of a successful API response. */
export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

/** The shape of a failed API response. */
export interface ApiFailure {
  ok: false;
  error: string;
}

/** Either kind of API response. */
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Builds a successful JSON response.
 *
 * @param data The payload to return.
 * @param status HTTP status code. Defaults to 200.
 * @returns A Next.js JSON response.
 */
export function apiOk<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ ok: true as const, data }, { status });
}

/**
 * Builds a failed JSON response.
 *
 * @param error  The message to show the user.
 * @param status HTTP status code. Defaults to 400.
 * @returns A Next.js JSON response.
 */
export function apiError(error: string, status = 400): NextResponse<ApiFailure> {
  return NextResponse.json({ ok: false as const, error }, { status });
}

/**
 * Builds the standard "you are not signed in" response.
 *
 * Route handlers return this when {@link requireApiUser} did not find a
 * session. A Route Handler must always answer with a `Response`, so the
 * failure case cannot simply be skipped.
 *
 * @returns A Next.js JSON response with status 401.
 */
export function unauthorized(): NextResponse<ApiFailure> {
  return apiError("You need to sign in to do that.", 401);
}

/**
 * Returns the signed-in user, or `null` when there is no valid session.
 *
 * The caller is expected to answer with {@link unauthorized} in that case:
 *
 * ```ts
 * const auth = await requireApiUser();
 * if (!auth) return unauthorized();
 * ```
 *
 * @returns `{ user }` when authenticated, otherwise `null`.
 */
export async function requireApiUser(): Promise<{ user: User } | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  return { user: current.user };
}

/**
 * Reads a JSON body and returns it, or `null` when the body is not valid
 * JSON.
 *
 * @param request The incoming request.
 * @returns The parsed body, or `null`.
 */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * Rejects state-changing requests that come from a different site.
 *
 * SameSite=Lax cookies already block cross-site POSTs in modern browsers;
 * this is a second, cheap line of defence. Requests without an Origin header
 * (curl, native apps) are allowed because the session cookie is httpOnly and
 * still required.
 */
export function crossOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== request.headers.get("host");
  } catch {
    return true;
  }
}

/** Returns a 403 response for a cross-origin mutation. */
export function forbidCrossOrigin(): NextResponse<ApiFailure> {
  return apiError("This request came from an untrusted origin.", 403);
}

/**
 * Turns a thrown domain error into the standard JSON envelope.
 *
 * @param error Any thrown value.
 * @returns A 400/404/409 response with a safe message.
 */
export function routeError(error: unknown): NextResponse<ApiFailure> {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return apiError(String((error as { message: unknown }).message), (error as { status: number }).status);
  }
  console.error(error);
  return apiError("Something went wrong. Please try again.", 500);
}
