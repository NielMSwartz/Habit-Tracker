"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Clock3, MoonStar } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SectionCard } from "@/components/ui/SectionCard";
import { Spinner } from "@/components/ui/Spinner";
import { Switch } from "@/components/ui/Switch";

const LEAD_OPTIONS = [
  { value: 0, label: "At the reminder time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
];

/** In-app reminders, browser notifications and quiet hours. */
export function NotificationSettings() {
  const { data, saveSettings } = useApp();
  const settings = data?.notifications;
  const [inApp, setInApp] = useState(settings?.inApp ?? true);
  const [browser, setBrowser] = useState(settings?.browser ?? false);
  const [lead, setLead] = useState(settings?.reminderLeadMinutes ?? 0);
  const [quiet, setQuiet] = useState(
    Boolean(settings?.quietFrom || settings?.quietUntil),
  );
  const [quietFrom, setQuietFrom] = useState(settings?.quietFrom ?? "22:00");
  const [quietUntil, setQuietUntil] = useState(settings?.quietUntil ?? "07:00");
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported" | null
  >(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const toggleBrowser = async (checked: boolean) => {
    setNote(null);
    if (!checked) {
      setBrowser(false);
      return;
    }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNote("This browser does not support desktop notifications.");
      return;
    }
    if (Notification.permission === "denied") {
      setNote(
        "Notifications are blocked for this site. Allow them in your browser's site settings, then try again.",
      );
      return;
    }
    let current: NotificationPermission = Notification.permission;
    if (current === "default") {
      current = await Notification.requestPermission();
      setPermission(current);
    }
    if (current === "granted") {
      setBrowser(true);
    } else {
      setNote("Permission was not granted, so browser notifications stay off.");
    }
  };

  const sendTest = () => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      setNote("Allow browser notifications first, then send a test.");
      return;
    }
    try {
      new Notification("Chromatic reminder", {
        body: "This is how a habit reminder will look.",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge.png",
        tag: "chromatic-test",
      });
    } catch {
      setNote("Your browser blocked the test notification.");
    }
  };

  const save = async () => {
    setSaving(true);
    await saveSettings({
      notifications: {
        inApp,
        browser,
        reminderLeadMinutes: lead,
        quietFrom: quiet ? quietFrom : null,
        quietUntil: quiet ? quietUntil : null,
      },
    });
    setSaving(false);
  };

  return (
    <SectionCard
      title="Notifications"
      description="Gentle nudges, never noise. Reminders use each habit's own time."
      eyebrow="Reminders"
    >
      <div className="space-y-3">
        <Switch
          checked={inApp}
          onChange={setInApp}
          label="In-app reminders"
          description="A toast inside Chromatic when a habit becomes due."
        />
        <Switch
          checked={browser}
          onChange={(checked) => void toggleBrowser(checked)}
          label="Browser notifications"
          description="System notifications while Chromatic is open or when you return to it."
          disabled={permission === "unsupported"}
        />

        {permission === "unsupported" ? (
          <p className="rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)]">
            This browser does not support notifications. In-app reminders still work.
          </p>
        ) : null}
        {note ? (
          <p role="status" className="rounded-xl bg-[var(--warning-soft)] px-3 py-2 text-xs font-medium text-[var(--warning)]">
            {note}
          </p>
        ) : null}
        {browser && permission === "granted" ? (
          <button type="button" className="btn btn-outline btn-sm" onClick={sendTest}>
            <BellRing className="size-3.5" /> Send a test notification
          </button>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="notification-lead">
              <span className="inline-flex items-center gap-1.5">
                <Bell className="size-3.5" /> Remind me
              </span>
            </label>
            <select
              id="notification-lead"
              className="select"
              value={lead}
              onChange={(event) => setLead(Number(event.target.value))}
            >
              {LEAD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="label">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" /> Quiet hours
              </span>
            </p>
            <Switch
              checked={quiet}
              onChange={setQuiet}
              label="Pause reminders"
              description="No nudges during this window."
            />
          </div>
        </div>

        {quiet ? (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2/40 p-3">
            <div>
              <label className="label" htmlFor="quiet-from">
                From
              </label>
              <input
                id="quiet-from"
                type="time"
                className="input"
                value={quietFrom}
                onChange={(event) => setQuietFrom(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="quiet-until">
                Until
              </label>
              <input
                id="quiet-until"
                type="time"
                className="input"
                value={quietUntil}
                onChange={(event) => setQuietUntil(event.target.value)}
              />
            </div>
            <p className="col-span-2 flex items-center gap-1.5 text-[0.68rem] text-faint">
              <MoonStar className="size-3" />
              Quiet hours can cross midnight, for example 22:00 to 07:00.
            </p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner size={15} /> : <Check className="size-4" />}
            Save notifications
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
