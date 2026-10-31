import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    "mobile-web-app-capable": "yes",
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
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
