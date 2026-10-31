"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  ListChecks,
  Settings,
  WifiOff,
  CloudUpload,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { cn, initials } from "@/lib/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/habits", label: "Habits", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, offline, queueSize } = useApp();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-[color-mix(in_oklch,var(--surface-solid)_72%,transparent)] px-3 py-5 backdrop-blur-xl lg:flex">
        <Link
          href="/dashboard"
          className="mx-2 flex items-center gap-2.5 rounded-2xl py-1"
          aria-label="Chromatic dashboard"
        >
          <span className="relative grid size-10 place-items-center overflow-hidden rounded-2xl bg-[var(--brand-gradient)] text-white shadow-[var(--shadow-accent)]">
            <Sparkles className="size-5" />
          </span>
          <span>
            <span className="block text-lg font-bold leading-tight tracking-tight text-ink">
              Chromatic
            </span>
            <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-muted">
              Habits in colour
            </span>
          </span>
        </Link>

        <nav className="mt-7 flex flex-1 flex-col gap-1" aria-label="Main navigation">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-item"
                data-active={active}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-[1.15rem]" />
                {item.label}
                {active ? (
                  <span className="ml-auto size-1.5 rounded-full bg-[var(--accent)]" aria-hidden="true" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 space-y-2">
          {offline || queueSize > 0 ? (
            <div className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-2 text-[0.7rem] font-medium text-accent">
              <span className="flex items-center gap-1.5">
                {offline ? <WifiOff className="size-3.5" /> : <CloudUpload className="size-3.5" />}
                {offline ? "Offline" : "Syncing"}
                {queueSize > 0 ? ` · ${queueSize} queued` : ""}
              </span>
            </div>
          ) : null}

          <Link
            href="/settings"
            className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/70 p-2.5 transition-colors hover:border-line-strong"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
              {initials(user.name) || "C"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-[0.65rem] text-muted">{user.email}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="glass-nav sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 pt-safe lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2" aria-label="Chromatic dashboard">
            <span className="grid size-8 place-items-center rounded-xl bg-[var(--brand-gradient)] text-white">
              <Sparkles className="size-4" />
            </span>
            <span className="text-base font-bold tracking-tight text-ink">Chromatic</span>
          </Link>
          <div className="flex items-center gap-2">
            {offline ? (
              <span className="chip !border-transparent !bg-[var(--warning-soft)] !text-[var(--warning)]">
                <WifiOff className="size-3" /> Offline
              </span>
            ) : queueSize > 0 ? (
              <span className="chip">
                <CloudUpload className="size-3" /> {queueSize}
              </span>
            ) : null}
            <Link
              href="/settings"
              className="grid size-8 place-items-center rounded-full bg-accent-soft text-[0.65rem] font-bold text-accent"
              aria-label="Open settings"
            >
              {initials(user.name) || "C"}
            </Link>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-7xl px-3 pb-28 pt-4 sm:px-5 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8",
          )}
        >
          {children}
        </main>
      </div>

      <nav
        className="glass-nav fixed inset-x-0 bottom-0 z-40 border-t border-line pb-safe lg:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-1 pb-1.5 pt-2.5 text-[0.6rem] font-semibold transition-colors",
                  active ? "text-[var(--accent)]" : "text-muted hover:text-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "grid size-8 place-items-center rounded-xl transition-all",
                    active && "bg-[var(--accent-soft)]",
                  )}
                >
                  <item.icon className="size-[1.1rem]" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
