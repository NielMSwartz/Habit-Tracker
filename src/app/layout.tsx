import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Chromatic — habits in colour",
    template: "%s · Chromatic",
  },
  description:
    "A vibrant habit tracker with multi-step routines, focus timers, flexible schedules, heatmaps and cross-device sync.",
  applicationName: "Chromatic",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Chromatic",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
  other: {
    // iOS still looks for the Apple-prefixed flag in some versions; Next emits
    // the standard `mobile-web-app-capable` from `appleWebApp.capable`.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9ff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0a14" },
  ],
};

/**
 * Capture the one-shot `beforeinstallprompt` event before React hydrates.
 * Without this, a repeat visitor can miss the event and the install button
 * silently does nothing until the next full page load.
 */
const installScript = `(function(){try{
  window.__chromaticInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.__chromaticInstallPrompt = event;
    window.dispatchEvent(new Event('chromatic:install-available'));
  });
  window.addEventListener('appinstalled', function () {
    window.__chromaticInstallPrompt = null;
    window.dispatchEvent(new Event('chromatic:install-available'));
  });
}catch(e){}})();`;

const themeScript = `(function(){try{
  var stored = localStorage.getItem('chromatic-theme') || 'system';
  var dark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  var hue = localStorage.getItem('chromatic-hue');
  if (hue) document.documentElement.style.setProperty('--accent-hue', hue);
}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: installScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
