/**
 * src/lib/pwa.ts
 * ---------------------------------------------------------------------------
 * Small, framework-free helpers for the installable-app experience.
 *
 * Browsers that support installation fire a `beforeinstallprompt` event once.
 * The event must be captured and kept around so a later click can call
 * `prompt()`. An inline script in the root layout stores it on `window` before
 * React hydrates, which means the event is never missed on repeat visits.
 */

/** The non-standard Chromium event used to trigger the install dialog. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Broad platform buckets used to tailor install instructions. */
export type InstallPlatform = "ios" | "android" | "desktop";

/** The custom event dispatched when the deferred prompt becomes available. */
export const INSTALL_AVAILABLE_EVENT = "chromatic:install-available";

/** Remembers that the user dismissed the install banner. */
export const INSTALL_DISMISS_KEY = "chromatic-install-dismissed";

type InstallWindow = Window & {
  __chromaticInstallPrompt?: BeforeInstallPromptEvent | null;
};

/** Returns the deferred install prompt captured by the inline layout script. */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  if (typeof window === "undefined") return null;
  return (window as InstallWindow).__chromaticInstallPrompt ?? null;
}

/** True when the app is already running as an installed app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const displayModes = ["standalone", "window-controls-overlay", "minimal-ui"];
  if (displayModes.some((mode) => window.matchMedia(`(display-mode: ${mode})`).matches)) {
    return true;
  }

  // iOS Safari exposes a non-standard flag instead of a display-mode match.
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** Detects the platform so the right set of manual steps can be shown. */
export function detectPlatform(): InstallPlatform {
  if (typeof navigator === "undefined") return "desktop";

  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  // iPadOS 13+ reports a desktop "Macintosh" user agent but still has touch.
  if (/macintosh/.test(userAgent) && navigator.maxTouchPoints > 1) return "ios";
  if (/android/.test(userAgent)) return "android";
  return "desktop";
}

/**
 * Opens the browser's native install dialog, if one is available.
 *
 * @returns `accepted`, `dismissed`, or `unavailable` when the browser never
 *   offered a prompt (iOS Safari, Firefox, or a previously dismissed prompt).
 */
export async function runInstallPrompt(): Promise<
  "accepted" | "dismissed" | "unavailable"
> {
  const event = getDeferredPrompt();
  if (!event) return "unavailable";

  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome;
  } catch {
    return "unavailable";
  } finally {
    // A deferred prompt can only be used once.
    (window as InstallWindow).__chromaticInstallPrompt = null;
  }
}
