"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that powers installability and offline mode.
 *
 * Browsers require an active service worker before they offer to install a
 * PWA, so this also runs in development — but with `?dev=1`, which tells the
 * worker to stay out of the way and skip caching entirely. That keeps local
 * development installable without serving stale Next.js assets.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isDev = process.env.NODE_ENV !== "production";
    const scriptUrl = isDev ? "/sw.js?dev=1" : "/sw.js";

    const register = () => {
      navigator.serviceWorker.register(scriptUrl, { scope: "/" }).catch(() => {
        // Offline support is progressive; the app still works without it.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
