"use client";

import { useEffect, useState } from "react";
import { Download, Sparkles, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "chromatic-install-dismissed";

/** Shows a tasteful install banner when the browser offers one. */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (incoming: Event) => {
      incoming.preventDefault();
      setEvent(incoming as InstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setEvent(null);
      localStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !event) return null;

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
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
            <button type="button" className="btn btn-primary btn-sm" onClick={install}>
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
