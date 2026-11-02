"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import { INSTALL_DISMISS_KEY } from "@/lib/pwa";
import { useInstall } from "./useInstall";

/**
 * A tasteful one-time install banner, shown only when the browser has actually
 * offered a native install prompt. Browsers without one (iOS Safari, Firefox)
 * use the persistent `InstallButton` and its instructions instead.
 */
export function InstallPrompt() {
  const { ready, installed, canPrompt, install } = useInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ready || installed || !canPrompt) return;
    if (localStorage.getItem(INSTALL_DISMISS_KEY) === "1") return;
    setVisible(true);
  }, [ready, installed, canPrompt]);

  if (!visible || !canPrompt) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
  };

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "accepted" || outcome === "dismissed") {
      setVisible(false);
      localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    }
  };

  return (
    <div className="fixed inset-x-3 bottom-[4.9rem] z-50 lg:inset-x-auto lg:bottom-5 lg:right-5 lg:w-[24rem]">
      <div className="card-solid flex items-start gap-3 rounded-2xl border border-line-strong p-3.5 shadow-[var(--shadow-lg)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-gradient)] text-white">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">Install Chromatic</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            Keep your habits one tap away, with offline support and a full-screen
            experience.
          </p>
          <div className="mt-2 flex gap-1.5">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleInstall}>
              <Download className="size-3.5" /> Install
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg p-1 text-faint hover:bg-surface-2 hover:text-ink"
          aria-label="Dismiss install prompt"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
