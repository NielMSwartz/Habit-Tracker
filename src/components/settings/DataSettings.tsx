"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Download,
  HardDriveDownload,
  MonitorSmartphone,
  Share,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";

/** Data export and a short, honest guide to installing the PWA. */
export function DataSettings() {
  const [standalone, setStandalone] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const navigatorStandalone = (navigator as Navigator & { standalone?: boolean })
      .standalone;
    setStandalone(media.matches || navigatorStandalone === true);

    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setPlatform("ios");
    else if (/android/.test(userAgent)) setPlatform("android");
    else setPlatform("desktop");
  }, []);

  return (
    <SectionCard
      title="Data & app"
      description="Take your data with you, and keep Chromatic one tap away."
      eyebrow="Portability"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2/40 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-accent">
              <HardDriveDownload className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">Export everything</p>
              <p className="text-xs leading-relaxed text-muted">
                Habits, steps, occurrences, timers, tasks, categories and settings
                as a single JSON file.
              </p>
            </div>
          </div>
          <a
            href="/api/export"
            download
            className="btn btn-outline btn-sm shrink-0"
          >
            <Download className="size-3.5" /> Download JSON
          </a>
        </div>

        <div className="rounded-xl border border-line bg-surface-2/40 p-3">
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] text-accent">
              {platform === "ios" || platform === "android" ? (
                <Smartphone className="size-4" />
              ) : (
                <MonitorSmartphone className="size-4" />
              )}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                Install Chromatic
                {standalone ? (
                  <span className="chip !border-transparent !bg-[var(--success-soft)] !text-[var(--success)]">
                    <CheckCircle2 className="size-3" /> Installed
                  </span>
                ) : null}
              </p>
              {standalone ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  You are using the installed app. It opens full-screen and keeps
                  working offline.
                </p>
              ) : platform === "ios" ? (
                <ol className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted">
                  <li className="flex items-start gap-1.5">
                    <Share className="mt-0.5 size-3 shrink-0" />
                    Open this page in Safari, then tap the Share button.
                  </li>
                  <li>2. Choose &ldquo;Add to Home Screen&rdquo;.</li>
                  <li>3. Confirm with &ldquo;Add&rdquo;.</li>
                </ol>
              ) : platform === "android" ? (
                <ol className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted">
                  <li>1. Open the browser menu (three dots).</li>
                  <li>2. Choose &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;.</li>
                  <li>3. Confirm the install prompt.</li>
                </ol>
              ) : platform === "desktop" ? (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Look for the install icon in your browser&rsquo;s address bar, or
                  choose &ldquo;Install Chromatic&rdquo; from the browser menu.
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                  Use your browser&rsquo;s install or &ldquo;Add to Home Screen&rdquo; action.
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="flex items-start gap-1.5 rounded-xl border border-dashed border-line-strong px-3 py-2.5 text-[0.7rem] leading-relaxed text-muted">
          <WifiOff className="mt-0.5 size-3.5 shrink-0 text-accent" />
          Offline mode caches the app shell and your latest snapshot. Step and task
          changes are queued on this device and sync automatically when the
          connection returns.
        </p>
      </div>
    </SectionCard>
  );
}
