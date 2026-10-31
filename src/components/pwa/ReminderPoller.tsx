"use client";

import { useEffect, useRef } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { useToast } from "@/components/ui/Toast";
import { apiFetch } from "@/lib/client/api";
import type { ReminderDTO } from "@/lib/types";

const POLL_MS = 60_000;

/**
 * Polls for reminders that are due now. The server records each delivery in
 * `ReminderLog`, so multiple tabs and devices cannot double-notify. Browser
 * notifications are only used when the person explicitly granted permission.
 */
export function ReminderPoller() {
  const { data } = useApp();
  const toast = useToast();
  const seen = useRef(new Set<string>());
  const settings = data?.notifications;

  useEffect(() => {
    if (!settings || (!settings.inApp && !settings.browser)) return;

    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState === "hidden" && !settings.browser) return;
      try {
        const due = await apiFetch<ReminderDTO[]>("/api/reminders/due");
        if (cancelled) return;
        for (const reminder of due) {
          const key = `${reminder.habitId}:${reminder.date}:${reminder.time}`;
          if (seen.current.has(key)) continue;
          seen.current.add(key);

          if (settings.inApp) {
            toast.push({
              tone: "reminder",
              title: `${reminder.habitName} · ${reminder.time}`,
              description: reminder.message,
              duration: 9000,
              action: {
                label: "Open today",
                onClick: () => window.location.assign("/dashboard"),
              },
            });
          }

          if (
            settings.browser &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(reminder.habitName, {
                body: reminder.message,
                icon: "/icons/icon-192.png",
                badge: "/icons/badge.png",
                tag: key,
              });
            } catch {
              // Some browsers require the service worker for notifications.
            }
          }
        }
      } catch {
        // Reminders are best-effort; a failed poll should stay invisible.
      }
    };

    void poll();
    const interval = window.setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [settings, toast]);

  return null;
}
