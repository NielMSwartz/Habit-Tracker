/** Browser API client with an IndexedDB retry queue for offline mutations. */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor() {
    super("You appear to be offline.");
    this.name = "NetworkError";
  }
}

export interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** JSON request helper that understands the app's response envelope. */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new NetworkError();
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson
    ? ((await response.json().catch(() => null)) as Envelope<T> | null)
    : null;

  if (!response.ok || !payload?.ok) {
    const message =
      payload?.error ??
      (response.status === 401
        ? "Your session has expired. Please sign in again."
        : `Request failed (${response.status}).`);
    if (response.status === 401 && typeof window !== "undefined") {
      // Let the shell decide how to present the expired session.
      window.dispatchEvent(new CustomEvent("chromatic:unauthorized"));
    }
    throw new ApiError(message, response.status);
  }

  return payload.data as T;
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/* --------------------------------------------------------------------------
 * IndexedDB queue
 * ----------------------------------------------------------------------- */

const DB_NAME = "chromatic";
const STORE = "mutations";
const CHANNEL_EVENT = "chromatic:queue";

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string;
  createdAt: string;
  attempts: number;
  label: string;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function announceQueue() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANNEL_EVENT));
}

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, "id" | "createdAt" | "attempts">,
): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put({
    ...mutation,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  } satisfies QueuedMutation);
  await transactionDone(tx);
  announceQueue();
}

export async function listQueue(): Promise<QueuedMutation[]> {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () =>
      resolve((request.result as QueuedMutation[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    request.onerror = () => resolve([]);
  });
}

export async function removeQueued(id: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await transactionDone(tx);
  announceQueue();
}

export async function queueCount(): Promise<number> {
  return (await listQueue()).length;
}

/** Sends every queued mutation in order. Stops on a network failure. */
export async function flushQueue(): Promise<{ sent: number; remaining: number }> {
  if (isOffline()) return { sent: 0, remaining: (await listQueue()).length };
  const items = await listQueue();
  let sent = 0;

  for (const item of items) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: item.body,
      });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 429)) {
        await removeQueued(item.id);
        sent += 1;
        continue;
      }
      if (response.status === 401 || response.status === 429 || response.status >= 500) {
        break;
      }
    } catch {
      break;
    }
  }

  const remaining = (await listQueue()).length;
  if (sent > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("chromatic:queue-flushed", { detail: { sent } }));
  }
  return { sent, remaining };
}

/**
 * Sends a mutation. Network failures with `queue` enabled are stored and
 * retried when connectivity returns; the optimistic UI stays in place.
 */
export async function sendMutation<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE" | "PUT",
  body: unknown,
  options: { queue?: boolean; label?: string } = {},
): Promise<{ data: T | null; queued: boolean }> {
  const serialised = JSON.stringify(body ?? {});
  try {
    const data = await apiFetch<T>(path, { method, body: serialised });
    return { data, queued: false };
  } catch (error) {
    if (
      (error instanceof NetworkError || isOffline()) &&
      options.queue !== false
    ) {
      await enqueueMutation({
        url: path,
        method,
        body: serialised,
        label: options.label ?? `${method} ${path}`,
      });
      return { data: null, queued: true };
    }
    throw error;
  }
}

/** Subscribes to queue changes; returns an unsubscribe function. */
export function subscribeQueue(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANNEL_EVENT, listener);
  return () => window.removeEventListener(CHANNEL_EVENT, listener);
}

/** Empties the offline mutation queue without touching server data. */
export async function clearQueuedMutations(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await transactionDone(tx);
  db.close();
  announceQueue();
}

/**
 * Removes account-specific traces from this browser when signing out:
 * the cached overview snapshots, queued mutations and cached pages.
 */
export async function clearOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("chromatic-overview-")) localStorage.removeItem(key);
    }
  } catch {
    /* Storage may be unavailable in private mode. */
  }

  try {
    await clearQueuedMutations();
  } catch {
    /* A blocked queue should not prevent signing out. */
  }

  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    registration?.active?.postMessage({ type: "CLEAR_CACHES" });
  } catch {
    /* Service workers are optional. */
  }
}
