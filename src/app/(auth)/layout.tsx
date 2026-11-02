import Link from "next/link";
import type { Metadata } from "next";
import {
  CalendarHeart,
  CloudSun,
  Layers3,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { requireGuest } from "@/lib/auth";
import { InstallButton } from "@/components/pwa/InstallButton";

export const metadata: Metadata = {
  title: "Sign in",
};

const FEATURES = [
  { icon: Layers3, text: "Multi-step habits that only complete when they are truly done" },
  { icon: Timer, text: "Focus timers measured on the server, impossible to skip" },
  { icon: CalendarHeart, text: "Daily, weekly, monthly and one-off rhythms in one calendar" },
  { icon: CloudSun, text: "Offline-first, synced across every device you own" },
];

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await requireGuest();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.08fr_minmax(30rem,0.92fr)]">
      <section className="relative hidden overflow-hidden p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(38rem 30rem at 15% 12%, oklch(0.64 0.24 292 / 0.35), transparent 65%), radial-gradient(34rem 28rem at 92% 78%, oklch(0.67 0.26 340 / 0.28), transparent 62%), radial-gradient(30rem 24rem at 50% 108%, oklch(0.75 0.15 185 / 0.25), transparent 65%), var(--bg)",
          }}
          aria-hidden="true"
        />
        <div
          className="animate-float pointer-events-none absolute -right-24 top-1/4 size-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--brand-violet)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-20 bottom-8 size-64 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--brand-teal)" }}
          aria-hidden="true"
        />

        <Link href="/" className="flex w-fit items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--brand-gradient)] text-white shadow-[var(--shadow-accent)]">
            <Sparkles className="size-5" />
          </span>
          <span>
            <span className="block text-xl font-bold leading-tight tracking-tight text-ink">
              Chromatic
            </span>
            <span className="block text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted">
              Habits in colour
            </span>
          </span>
        </Link>

        <div className="max-w-xl py-10">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3 py-1 text-[0.7rem] font-semibold text-soft backdrop-blur">
            <span className="size-1.5 rounded-full bg-[var(--success)]" />
            Small steps. Bright progress.
          </p>
          <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-ink xl:text-5xl">
            Habit tracking that{" "}
            <span className="text-gradient">actually feels good</span>.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-soft">
            Build routines with real steps, honest timers and a schedule that bends
            without breaking. See your progress bloom in colour.
          </p>

          <ul className="mt-8 space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature.text} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] text-accent">
                  <feature.icon className="size-4" />
                </span>
                <span className="text-sm leading-relaxed text-soft">{feature.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.7rem] font-medium text-muted">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Private by default
          </span>
          <span>No ads. No streaks guilt.</span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5" /> Installable PWA
          </span>
        </div>
      </section>

      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8 sm:px-8">
        <Link href="/" className="mb-7 flex items-center gap-2.5 lg:hidden">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--brand-gradient)] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">Chromatic</span>
        </Link>
        <div className="card w-full max-w-md p-5 sm:p-7">{children}</div>
        <div className="mt-4">
          <InstallButton className="btn btn-ghost btn-sm" label="Install Chromatic" />
        </div>
        <p className="mt-3 text-center text-[0.68rem] text-faint">
          Protected by httpOnly session cookies · bcrypt password hashing
        </p>
      </main>
    </div>
  );
}
