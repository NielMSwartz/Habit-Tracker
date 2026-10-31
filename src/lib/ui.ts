/** Small presentation helpers shared by client components. */

import { cn } from "./utils";

export { cn };

/** A vivid OKLCH colour from a 0–359 hue. */
export function hueColor(hue: number, lightness = 62, chroma = 0.22): string {
  return `oklch(${lightness}% ${chroma} ${((hue % 360) + 360) % 360})`;
}

/** A translucent tint of a habit colour. */
export function hueTint(hue: number, alpha = 0.12): string {
  return `oklch(0.65 0.2 ${((hue % 360) + 360) % 360} / ${alpha})`;
}

/** 0.823 → "82%" */
export function percent(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0%";
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Minutes → "1h 25m" / "45m". */
export function durationLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  if (safe < 60) return `${safe}m`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "2 hours ago", "just now". */
export function relativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Time-of-day greeting. */
export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** First letters of a name. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

/** Adds an "s" when needed. */
export function plural(
  count: number,
  singular: string,
  pluralForm?: string,
): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/** A readable foreground for a hue. */
export function readableInk(hue: number): string {
  const normalised = ((hue % 360) + 360) % 360;
  return normalised > 45 && normalised < 200 ? "#17121f" : "#ffffff";
}

export const HUE_PRESETS = [
  { name: "Electric blue", hue: 248 },
  { name: "Violet", hue: 285 },
  { name: "Magenta", hue: 330 },
  { name: "Coral", hue: 25 },
  { name: "Amber", hue: 70 },
  { name: "Lime", hue: 128 },
  { name: "Teal", hue: 178 },
  { name: "Cyan", hue: 205 },
  { name: "Rose", hue: 358 },
  { name: "Indigo", hue: 268 },
] as const;

export const EMOJI_CHOICES = [
  "🌱",
  "💧",
  "📚",
  "🏃",
  "🧘",
  "🧠",
  "💪",
  "🫁",
  "🛏️",
  "🍎",
  "🥗",
  "☕",
  "✍️",
  "🎸",
  "🎨",
  "🧹",
  "💻",
  "🌿",
  "🐕",
  "🌙",
  "☀️",
  "🩺",
  "💊",
  "💸",
] as const;

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Formats a number with a narrow, tabular-friendly separator. */
export function numberLabel(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/** The readable label for an occurrence status. */
export function occurrenceLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Complete";
    case "partial":
      return "In progress";
    case "skipped":
      return "Skipped";
    default:
      return "To do";
  }
}
