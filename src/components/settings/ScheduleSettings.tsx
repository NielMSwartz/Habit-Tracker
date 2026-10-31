"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, Globe2, MapPin } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SectionCard } from "@/components/ui/SectionCard";
import { Segmented } from "@/components/ui/Segmented";
import { Spinner } from "@/components/ui/Spinner";
import type { CalendarView } from "@/lib/types";
import { deviceTimezone, listTimezones, timezoneLabel } from "@/lib/timezones";

const CALENDAR_VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "list", label: "List" },
];

/** Timezone, first day of the week and the calendar's opening view. */
export function ScheduleSettings() {
  const { user, saveSettings } = useApp();
  const [timezone, setTimezone] = useState(user.timezone);
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(
    user.weekStartsOn === 1 ? 1 : 0,
  );
  const [calendarView, setCalendarView] = useState<CalendarView>(
    user.defaultCalendarView,
  );
  const [saving, setSaving] = useState(false);
  const [localTime, setLocalTime] = useState("--:--");

  // Rendered after mounting so server and client never disagree on the clock.
  useEffect(() => {
    const tick = () => {
      try {
        setLocalTime(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date()),
        );
      } catch {
        setLocalTime("--:--");
      }
    };
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [timezone]);

  const zones = useMemo(() => listTimezones(timezone), [timezone]);
  const detected = useMemo(() => deviceTimezone(), []);
  const dirty =
    timezone !== user.timezone ||
    weekStartsOn !== user.weekStartsOn ||
    calendarView !== user.defaultCalendarView;

  const save = async () => {
    setSaving(true);
    await saveSettings({
      timezone,
      weekStartsOn,
      defaultCalendarView: calendarView,
    });
    setSaving(false);
  };

  return (
    <SectionCard
      title="Schedule & calendar"
      description="These choices decide which day counts as today and how your week is laid out."
      eyebrow="Time"
    >
      <div className="space-y-4">
        <div>
          <label className="label" htmlFor="settings-timezone">
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="size-3.5" /> Timezone
            </span>
          </label>
          <select
            id="settings-timezone"
            className="select"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          >
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {timezoneLabel(zone)}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Used for &ldquo;today&rdquo;, streaks and reminder times.{" "}
            {detected !== timezone ? (
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => setTimezone(detected)}
              >
                Use this device&rsquo;s timezone ({detected})
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--success)]">
                <MapPin className="size-3" /> Matches this device
              </span>
            )}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label">Week starts on</p>
            <Segmented
              value={weekStartsOn === 1 ? "mon" : "sun"}
              onChange={(value) =>
                setWeekStartsOn(value === "mon" ? 1 : 0)
              }
              ariaLabel="First day of the week"
              className="w-full"
              options={[
                { value: "mon", label: "Monday" },
                { value: "sun", label: "Sunday" },
              ]}
            />
          </div>
          <div>
            <label className="label" htmlFor="settings-calendar-view">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Default calendar view
              </span>
            </label>
            <select
              id="settings-calendar-view"
              className="select"
              value={calendarView}
              onChange={(event) =>
                setCalendarView(event.target.value as CalendarView)
              }
            >
              {CALENDAR_VIEWS.map((view) => (
                <option key={view.value} value={view.value}>
                  {view.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[0.7rem] text-muted">
            <Clock3 className="size-3.5 text-accent" />
            Local time now:{" "}
            <span className="font-semibold text-soft tabular-nums">{localTime}</span>
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? <Spinner size={13} /> : <Check className="size-3.5" />}
            Save schedule
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
