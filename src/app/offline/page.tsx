import type { Metadata } from "next";
import Link from "next/link";
import { CloudOff, RefreshCw, WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "Offline",
  description: "Chromatic is offline. Your saved data is still on this device.",
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card card-glow relative w-full max-w-md overflow-hidden p-6 text-center sm:p-8">
        <div
          className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--brand-violet)" }}
          aria-hidden="true"
        />
        <span className="relative mx-auto grid size-16 place-items-center rounded-3xl bg-[var(--accent-soft)] text-accent">
          <WifiOff className="size-7" />
          <CloudOff className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[var(--surface-solid)] p-0.5 text-[var(--warning)]" />
        </span>
        <h1 className="relative mt-5 text-2xl font-bold tracking-tight text-ink">
          You&rsquo;re off the grid
        </h1>
        <p className="relative mt-2 text-sm leading-relaxed text-muted">
          This page hasn&rsquo;t been saved for offline use yet. Any steps you
          checked before losing the connection are queued on this device and will
          sync automatically when you reconnect.
        </p>
        <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard" className="btn btn-primary">
            <RefreshCw className="size-4" /> Try dashboard
          </Link>
          <Link href="/" className="btn btn-outline">
            Go to start
          </Link>
        </div>
        <p className="relative mt-5 text-[0.68rem] leading-relaxed text-faint">
          Tip: open Chromatic while online once so the app shell is cached for
          next time.
        </p>
      </div>
    </main>
  );
}
