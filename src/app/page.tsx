import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CloudOff,
  Flame,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { InstallButton } from "@/components/pwa/InstallButton";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Multi-step habits",
    body: "Break a routine into honest, independently checkable steps. A habit is only complete when every required step is done.",
    hue: 250,
  },
  {
    icon: Timer,
    title: "Timers that can't be skipped",
    body: "Focus sessions are timestamped on the server, survive refreshes and hold the completion gate until the work is real.",
    hue: 190,
  },
  {
    icon: CalendarDays,
    title: "Schedules with memory",
    body: "Daily, weekdays, every N days, month days, yearly or one-off. Edits keep the history you already earned.",
    hue: 330,
  },
  {
    icon: Flame,
    title: "Streaks & heatmaps",
    body: "GitHub-style colour for every day, per habit or category. See the rhythm instead of guessing at it.",
    hue: 30,
  },
  {
    icon: BarChart3,
    title: "Analytics you can trust",
    body: "Rates, planned versus completed, focus minutes and period trends computed from real occurrence data.",
    hue: 285,
  },
  {
    icon: CloudOff,
    title: "Offline, then in sync",
    body: "Install it like an app. Check steps on a train, and the queue replays safely when you reconnect.",
    hue: 165,
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const current = await getCurrentUser();
  if (current) redirect("/dashboard");

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div
        className="pointer-events-none absolute -left-32 -top-40 size-[34rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--brand-violet)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-28 top-24 size-[28rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-teal)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/3 size-[30rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-magenta)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6">
        <header className="flex items-center justify-between gap-4 py-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Chromatic home">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--brand-gradient)] text-white shadow-[var(--shadow-accent)]">
              <Sparkles className="size-5" />
            </span>
            <span>
              <span className="block text-lg font-bold leading-tight tracking-tight text-ink">
                Chromatic
              </span>
              <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted">
                Habits in colour
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1.5" aria-label="Account">
            <InstallButton
              className="btn btn-ghost btn-sm hidden sm:inline-flex"
              label="Install"
            />
            <InstallButton iconOnly className="sm:hidden" label="Install Chromatic" />
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/register" className="btn btn-brand btn-sm">
              Get started <ArrowRight className="size-3.5" />
            </Link>
          </nav>
        </header>

        <section className="grid gap-10 pb-14 pt-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:gap-12 lg:pb-20 lg:pt-14">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-line)] bg-[var(--accent-soft)] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-accent">
              <Zap className="size-3" /> A habit tracker with range
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-[3.55rem]">
              Small steps.
              <br />
              <span className="text-gradient">Full spectrum.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Chromatic turns routines into multi-step habits, protects them with
              real timers, and paints the result in colour. Your data is private,
              synced across devices and still there when the signal isn&rsquo;t.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/register" className="btn btn-brand btn-lg">
                Start your first habit <ArrowRight className="size-4" />
              </Link>
              <Link href="/login" className="btn btn-outline btn-lg">
                I already have an account
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--success)]" /> Real email &amp; password auth
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--success)]" /> Free to install
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-[var(--success)]" /> Export anytime
              </li>
            </ul>
          </div>

          <div className="relative" aria-hidden="true">
            <div className="absolute inset-x-6 -bottom-4 h-24 rounded-[2rem] bg-[var(--brand-gradient)] opacity-20 blur-2xl" />
            <div className="card card-glow relative overflow-hidden p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-accent">
                    Today
                  </p>
                  <p className="text-lg font-bold text-ink">Good morning, Niel.</p>
                </div>
                <span className="grid size-11 place-items-center rounded-full border-[3px] border-[var(--accent)] text-xs font-bold tabular-nums text-ink">
                  2/3
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                <div className="rounded-2xl border border-line bg-surface-2/70 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl text-base" style={{ background: "oklch(0.68 0.2 155 / 0.16)" }}>
                      🌱
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink">Morning grounding</p>
                      <p className="text-[0.62rem] text-muted">3 of 3 steps · 5 min timer</p>
                    </div>
                    <span className="grid size-5 place-items-center rounded-md bg-[var(--success)] text-white">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full w-full rounded-full bg-[var(--success)]" />
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface-2/70 p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl text-base" style={{ background: "oklch(0.68 0.2 250 / 0.16)" }}>
                      📚
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink">Read 20 pages</p>
                      <p className="text-[0.62rem] text-muted">2 of 3 steps · timer running</p>
                    </div>
                    <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.58rem] font-bold text-accent">
                      12:08
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full w-2/3 rounded-full bg-[var(--accent)]" />
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-line-strong p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl text-base" style={{ background: "oklch(0.68 0.2 25 / 0.16)" }}>
                      🏃
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-ink">Evening run</p>
                      <p className="text-[0.62rem] text-muted">Scheduled for 18:30</p>
                    </div>
                    <span className="size-5 rounded-md border-[1.5px] border-line-strong" />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--brand-gradient)] px-3 py-2 text-white">
                <p className="text-[0.65rem] font-semibold">14-day streak · 4h 20m focused</p>
                <Flame className="size-4" />
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="pb-14">
          <div className="mb-6 max-w-2xl">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
              Built for the long run
            </p>
            <h2 id="features-heading" className="mt-1.5 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Everything a habit needs to become a life.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Not a checklist with a paint job. Chromatic models the schedule,
              the steps, the time spent and the history behind each day.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="card card-interactive p-4">
                <span
                  className="grid size-10 place-items-center rounded-2xl text-white"
                  style={{ background: `oklch(0.66 0.2 ${feature.hue})` }}
                >
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-ink">{feature.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-glow relative overflow-hidden p-6 sm:p-8">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-accent">
                <ShieldCheck className="size-3.5" /> Private by design
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-ink">
                Your habits belong to you.
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Every query is scoped to your session. Delete your account and
                every habit, occurrence and timer goes with it. Or export the
                whole lot in one click.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Link href="/register" className="btn btn-brand">
                Create a free account <ArrowRight className="size-4" />
              </Link>
              <span className="text-[0.68rem] text-faint">
                No credit card. No fake analytics.
              </span>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-line py-5 text-[0.7rem] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>Chromatic — a full-spectrum habit tracker.</p>
          <p className="flex items-center gap-3">
            <Link href="/login" className="hover:text-ink">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-ink">
              Create account
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
