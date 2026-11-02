"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Download,
  MonitorSmartphone,
  Share,
  Smartphone,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/ui";
import { useInstall } from "./useInstall";

interface InstallButtonProps {
  className?: string;
  label?: string;
  /** Render only the icon, for tight headers and toolbars. */
  iconOnly?: boolean;
  /** Keep the button visible (as an "Installed" note) after installation. */
  showWhenInstalled?: boolean;
}

/**
 * A discoverable install action for every browser.
 *
 * Where the browser supports installation the button opens the native dialog.
 * Everywhere else (iOS Safari, Firefox, a dismissed prompt) it explains the
 * manual "Add to Home Screen" / "Install app" steps instead of doing nothing.
 */
export function InstallButton({
  className,
  label = "Install app",
  iconOnly = false,
  showWhenInstalled = false,
}: InstallButtonProps) {
  const { ready, installed, canPrompt, platform, install } = useInstall();
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!ready) return null;
  if (installed && !showWhenInstalled) return null;

  const handleClick = async () => {
    if (installed) {
      setHelpOpen(true);
      return;
    }
    if (!canPrompt) {
      setHelpOpen(true);
      return;
    }

    setBusy(true);
    const outcome = await install();
    setBusy(false);
    if (outcome === "unavailable") setHelpOpen(true);
  };

  const Icon = installed ? CheckCircle2 : Download;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-label={iconOnly ? label : undefined}
        className={cn(
          iconOnly
            ? "grid size-8 place-items-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink"
            : className ?? "btn btn-outline btn-sm",
          iconOnly && className,
        )}
      >
        <Icon className={iconOnly ? "size-4" : "size-3.5"} />
        {iconOnly ? null : installed ? "Installed" : busy ? "Opening…" : label}
      </button>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={installed ? "Chromatic is installed" : "Install Chromatic"}
        description={
          installed
            ? "You are already using the installed app. It opens full-screen and keeps working offline."
            : "Add Chromatic to your home screen or desktop so it opens like a native app."
        }
        eyebrow="Installable app"
        size="sm"
        footer={
          <button
            type="button"
            className="btn btn-primary w-full"
            onClick={() => setHelpOpen(false)}
          >
            Got it
          </button>
        }
      >
        {installed ? (
          <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/50 p-3 text-sm leading-relaxed text-muted">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
            Look for the Chromatic icon in your app list, home screen or desktop
            dock.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-2.5 text-xs font-medium text-accent">
              {platform === "ios" || platform === "android" ? (
                <Smartphone className="size-4 shrink-0" />
              ) : (
                <MonitorSmartphone className="size-4 shrink-0" />
              )}
              {platform === "ios"
                ? "On iPhone and iPad, installation uses Safari's Share menu."
                : platform === "android"
                  ? "On Android, installation lives in your browser's menu."
                  : "On desktop, look for the install icon in the address bar."}
            </div>

            {platform === "ios" ? (
              <ol className="space-y-2.5 text-sm leading-relaxed text-muted">
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">1</span>
                  <span>
                    Open this page in <strong className="text-ink">Safari</strong>{" "}
                    (installation is not available inside other iOS browsers).
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">2</span>
                  <span className="flex items-start gap-1.5">
                    Tap the <Share className="mt-0.5 size-4 shrink-0 text-accent" />
                    <strong className="text-ink">Share</strong> button.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">3</span>
                  <span>
                    Choose <strong className="text-ink">Add to Home Screen</strong>{" "}
                    and confirm with <strong className="text-ink">Add</strong>.
                  </span>
                </li>
              </ol>
            ) : platform === "android" ? (
              <ol className="space-y-2.5 text-sm leading-relaxed text-muted">
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">1</span>
                  <span>
                    Open the browser menu (the <strong className="text-ink">three dots</strong>).
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">2</span>
                  <span>
                    Choose <strong className="text-ink">Install app</strong> or{" "}
                    <strong className="text-ink">Add to Home screen</strong>.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">3</span>
                  <span>Confirm the install prompt.</span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm leading-relaxed text-muted">
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">1</span>
                  <span>
                    Look for the <strong className="text-ink">install icon</strong>{" "}
                    in the browser address bar.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">2</span>
                  <span>
                    Or open the browser menu and choose{" "}
                    <strong className="text-ink">Install Chromatic</strong> /{" "}
                    <strong className="text-ink">Install this site as an app</strong>.
                  </span>
                </li>
                <li className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.7rem] font-bold text-accent">3</span>
                  <span>
                    Chromatic then opens in its own window, with an icon in your
                    app launcher.
                  </span>
                </li>
              </ol>
            )}

            {canPrompt ? (
              <button
                type="button"
                className="btn btn-primary w-full"
                onClick={async () => {
                  setBusy(true);
                  const outcome = await install();
                  setBusy(false);
                  if (outcome !== "unavailable") setHelpOpen(false);
                }}
                disabled={busy}
              >
                <Download className="size-4" /> Install automatically
              </button>
            ) : (
              <p className="text-[0.72rem] leading-relaxed text-faint">
                This browser does not expose an automatic install button. The
                steps above always work, and the app still runs normally in a
                browser tab.
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
