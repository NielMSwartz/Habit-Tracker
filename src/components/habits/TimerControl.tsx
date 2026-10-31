"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, Square, Timer } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Spinner } from "@/components/ui/Spinner";
import { formatDuration } from "@/lib/dates";
import type { OccurrenceDTO, TimerDTO } from "@/lib/types";
import { cn, durationLabel } from "@/lib/ui";

function remainingOf(timer: TimerDTO): number {
  if (timer.status === "running" && timer.endsAt) {
    return Math.max(0, new Date(timer.endsAt).getTime() - Date.now());
  }
  if (timer.status === "paused") {
    return Math.max(0, timer.durationMs - timer.accumulatedMs);
  }
  return 0;
}

interface TimerControlProps {
  occurrence: OccurrenceDTO;
  compact?: boolean;
  className?: string;
}

/**
 * The focus timer. Remaining time is derived from the persisted `endsAt`
 * timestamp every second, so closing the tab or sleeping the phone can never
 * "skip" the requirement — and the server refuses to credit early completion.
 */
export function TimerControl({ occurrence, compact = false, className }: TimerControlProps) {
  const { startTimer, timerAction, resetTimer } = useApp();
  const timer = occurrence.timer;
  const [remaining, setRemaining] = useState(() => (timer ? remainingOf(timer) : 0));
  const [busy, setBusy] = useState<string | null>(null);
  const finishing = useRef<string | null>(null);

  useEffect(() => {
    if (!timer) return;
    setRemaining(remainingOf(timer));
    if (timer.status !== "running" || !timer.endsAt) return;

    const tick = () => setRemaining(remainingOf(timer));
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  // When the countdown reaches zero, ask the server to credit it exactly once.
  useEffect(() => {
    if (!timer || timer.status !== "running") return;
    if (remaining > 400) return;
    if (finishing.current === timer.id) return;
    finishing.current = timer.id;
    void timerAction(timer.id, "complete");
  }, [remaining, timer, timerAction]);

  const act = async (action: "pause" | "resume" | "stop" | "complete") => {
    if (!timer) return;
    setBusy(action);
    try {
      await timerAction(timer.id, action);
    } finally {
      setBusy(null);
    }
  };

  const start = async () => {
    setBusy("start");
    try {
      await startTimer(occurrence);
    } finally {
      setBusy(null);
    }
  };

  if (occurrence.timerRequiredMs <= 0) return null;

  const requiredMinutes = Math.round(occurrence.timerRequiredMs / 60_000);
  const creditedMinutes = Math.floor(occurrence.timerMs / 60_000);
  const progress = Math.min(1, occurrence.timerMs / occurrence.timerRequiredMs);
  const total = Math.max(timer?.durationMs ?? occurrence.timerRequiredMs, 1);
  const elapsed = timer
    ? timer.status === "paused"
      ? timer.accumulatedMs
      : Math.max(0, total - remaining)
    : 0;
  const percent = Math.min(100, Math.max(0, (elapsed / total) * 100));
  const late = timer?.status === "running" && remaining <= 400;

  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface-2/80 p-3",
        compact && "rounded-xl p-2.5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-wide text-muted">
          <Timer className="size-3.5" />
          Focus timer
        </span>
        {occurrence.timerSatisfied ? (
          <span className="chip !border-transparent !bg-[var(--success-soft)] !text-[var(--success)]">
            <Check className="size-3" /> Requirement met
          </span>
        ) : (
          <span className="text-[0.68rem] font-semibold text-muted">
            {creditedMinutes}/{requiredMinutes} min
          </span>
        )}
      </div>

      {!occurrence.timerSatisfied ? (
        <div className="progress-track mt-2">
          <div
            className="progress-fill"
            style={{
              width: `${progress * 100}%`,
              background:
                "linear-gradient(90deg, oklch(0.66 0.21 285), oklch(0.72 0.2 340))",
            }}
          />
        </div>
      ) : null}

      {timer && (timer.status === "running" || timer.status === "paused") ? (
        <div className={cn("mt-3", compact && "mt-2")}>
          <div className="flex items-end justify-between gap-3">
            <p
              className={cn(
                "font-mono text-2xl font-bold tabular-nums tracking-tight text-ink",
                compact && "text-xl",
              )}
              aria-live="off"
            >
              {formatDuration(Math.ceil(remaining / 1000))}
            </p>
            <span className="chip">
              {timer.status === "paused" ? "Paused" : late ? "Ready to finish" : "Running"}
            </span>
          </div>
          <div className="progress-track mt-2">
            <div
              className="progress-fill"
              style={{
                width: `${percent}%`,
                background:
                  timer.status === "paused"
                    ? "var(--warning)"
                    : "linear-gradient(90deg, var(--brand-blue), var(--brand-violet), var(--brand-magenta))",
              }}
            />
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {timer.status === "running" && !late ? (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => act("pause")}
                disabled={busy !== null}
              >
                {busy === "pause" ? <Spinner size={13} /> : <Pause className="size-3.5" />}
                Pause
              </button>
            ) : null}
            {timer.status === "paused" ? (
              <button
                type="button"
                className="btn btn-soft btn-sm"
                onClick={() => act("resume")}
                disabled={busy !== null}
              >
                {busy === "resume" ? <Spinner size={13} /> : <Play className="size-3.5" />}
                Resume
              </button>
            ) : null}
            {late ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => act("complete")}
                disabled={busy !== null}
              >
                {busy === "complete" ? <Spinner size={13} /> : <Check className="size-3.5" />}
                Finish &amp; credit
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-ghost btn-sm text-[var(--danger)]"
              onClick={() => void resetTimer(timer.id)}
              disabled={busy !== null}
              title="Discard this timer"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => act("stop")}
              disabled={busy !== null}
              title="Stop and keep the elapsed time out of the requirement"
            >
              {busy === "stop" ? <Spinner size={13} /> : <Square className="size-3" />}
              Stop
            </button>
          </div>
        </div>
      ) : !occurrence.timerSatisfied ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-relaxed text-muted">
            {durationLabel(requiredMinutes)} of focus completes this habit.
          </p>
          <button
            type="button"
            className="btn btn-soft btn-sm"
            onClick={start}
            disabled={busy !== null}
          >
            {busy === "start" ? <Spinner size={13} /> : <Play className="size-3.5" />}
            Start timer
          </button>
        </div>
      ) : null}
    </div>
  );
}
