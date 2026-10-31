/**
 * src/lib/utils.ts
 * ---------------------------------------------------------------------------
 * Small shared helpers that do not belong to a specific feature.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges class names, letting later Tailwind utilities win over earlier ones.
 *
 * @param inputs Any number of class name values.
 * @returns The merged class string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Picks a readable foreground colour for a given background hue.
 *
 * @param hue The hue in degrees (0–359).
 * @returns `#ffffff` on dark backgrounds, `#0b0b12` on bright ones.
 */
export function readableOnHue(hue: number): string {
  return hue >= 45 && hue <= 200 ? "#0b0b12" : "#ffffff";
}

/**
 * Builds a CSS colour from a hue using the OKLCH colour space, which keeps
 * perceived brightness even across the whole colour wheel.
 *
 * @param hue       The hue in degrees (0–359).
 * @param lightness Lightness percentage (default 72).
 * @param chroma    Chroma percentage (default 0.16).
 * @returns A CSS `oklch()` colour string.
 */
export function chroma(hue: number, lightness = 72, chromaAmount = 0.16): string {
  return `oklch(${lightness}% ${chromaAmount} ${((hue % 360) + 360) % 360})`;
}

/**
 * Returns a semi-transparent version of a hue.
 *
 * @param hue    The hue in degrees.
 * @param alpha  Opacity between 0 and 1.
 * @param lightness Lightness percentage.
 * @returns A CSS `oklch()` colour string with alpha.
 */
export function chromaAlpha(hue: number, alpha: number, lightness = 72): string {
  return `oklch(${lightness}% 0.16 ${((hue % 360) + 360) % 360} / ${alpha})`;
}

/**
 * Formats a number with a fixed number of decimals.
 *
 * @param value    The number to format.
 * @param decimals How many decimals to keep.
 * @returns The formatted number as text.
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Returns a stable colour for a habit that has no colour of its own.
 *
 * @param seed Any string, usually the habit id.
 * @returns A hue between 0 and 359.
 */
export function hueFromSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 360;
  }
  return hash;
}
