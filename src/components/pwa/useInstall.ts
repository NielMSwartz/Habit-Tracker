"use client";

import { useCallback, useEffect, useState } from "react";
import {
  detectPlatform,
  getDeferredPrompt,
  INSTALL_AVAILABLE_EVENT,
  isStandalone,
  runInstallPrompt,
  type BeforeInstallPromptEvent,
  type InstallPlatform,
} from "@/lib/pwa";

export interface InstallState {
  /** False until the browser-only values have been read on the client. */
  ready: boolean;
  /** True when Chromatic is already running as an installed app. */
  installed: boolean;
  /** True when the browser has offered a native install prompt. */
  canPrompt: boolean;
  platform: InstallPlatform;
  /** Triggers the native prompt. Returns `unavailable` when there is none. */
  install: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

/** Tracks installability and keeps the deferred prompt in React state. */
export function useInstall(): InstallState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>("desktop");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());
    setPromptEvent(getDeferredPrompt());
    setReady(true);

    const syncPrompt = () => setPromptEvent(getDeferredPrompt());
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    const onDisplayMode = () => setInstalled(isStandalone());

    window.addEventListener(INSTALL_AVAILABLE_EVENT, syncPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const standalone = window.matchMedia("(display-mode: standalone)");
    standalone.addEventListener?.("change", onDisplayMode);

    return () => {
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, syncPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener?.("change", onDisplayMode);
    };
  }, []);

  const install = useCallback(async () => {
    const outcome = await runInstallPrompt();
    if (outcome === "accepted") setInstalled(true);
    setPromptEvent(getDeferredPrompt());
    return outcome;
  }, []);

  return {
    ready,
    installed,
    canPrompt: promptEvent !== null,
    platform,
    install,
  };
}
