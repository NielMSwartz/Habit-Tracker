/**
 * Timezone helpers that are safe to run in the browser.
 *
 * The list comes from the runtime's ICU data, with the device timezone always
 * included so the current value can never fall outside the menu.
 */

/** The IANA timezone reported by the current device, if available. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Every timezone the runtime knows about, sorted and de-duplicated. */
export function listTimezones(current?: string | null): string[] {
  const values = new Set<string>();

  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (typeof supported === "function") {
      for (const zone of supported("timeZone")) values.add(zone);
    }
  } catch {
    /* Older engines simply expose the device zone. */
  }

  values.add(deviceTimezone());
  if (current) values.add(current);
  values.add("UTC");

  return [...values].sort((a, b) => a.localeCompare(b));
}

/** A short human label such as "Europe/Amsterdam (GMT+1)". */
export function timezoneLabel(zone: string, date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      timeZoneName: "shortOffset",
    }).formatToParts(date);
    const offset = parts.find((part) => part.type === "timeZoneName")?.value;
    return offset ? `${zone} (${offset})` : zone;
  } catch {
    return zone;
  }
}
