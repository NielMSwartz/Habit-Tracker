"use client";

import { useState } from "react";
import {
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  MoreHorizontal,
  Pencil,
  SkipForward,
  StickyNote,
  Trash2,
  Undo2,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { TimerControl } from "@/components/habits/TimerControl";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateLabel } from "@/lib/dates";
import type { OccurrenceDTO } from "@/lib/types";
import { cn, hueColor, occurrenceLabel, percent } from "@/lib/ui";

interface OccurrenceCardProps {
  occurrence: OccurrenceDTO;
  onEdit?: (occurrence: OccurrenceDTO) => void;
  compact?: boolean;
  className?: string;
}

const STATUS_STYLES: Record<OccurrenceDTO["status"], string> = {
  completed: "!bg-[var(--success-soft)] !text-[var(--success)] !border-transparent",
  partial: "!bg-[var(--warning-soft)] !text-[var(--warning)] !border-transparent",
  skipped: "opacity-70",
  pending: "",
};

/**
 * One scheduled habit on a given day: independently checkable steps, progress,
 * the focus timer, and the actions that keep the calendar honest.
 */
export function OccurrenceCard({
  occurrence,
  onEdit,
  compact = false,
  className,
}: OccurrenceCardProps) {
  const { toggleStep, completeOccurrence, occurrenceAction, deleteOccurrence } = useApp();
  const [pendingStep, setPendingStep] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [moveDate, setMoveDate] = useState(occurrence.date);
  const [note, setNote] = useState(occurrence.note ?? "");
  const [busy, setBusy] = useState(false);

  const habit = occurrence.habit;
  const colour = hueColor(habit.hue);
  const completed = occurrence.status === "completed";
  const skipped = occurrence.status === "skipped";

  const checkStep = async (stepId: string, next: boolean) => {
    setPendingStep(stepId);
    try {
      await toggleStep(occurrence, stepId, next);
    } finally {
      setPendingStep(null);
    }
  };

  const finish = async () => {
    setCompleting(true);
    try {
      await completeOccurrence(occurrence);
    } finally {
      setCompleting(false);
    }
  };

  const move = async () => {
    if (moveDate === occurrence.date) {
      setMoveOpen(false);
      return;
    }
    setBusy(true);
    const ok = await occurrenceAction(occurrence.id, "reschedule", { date: moveDate });
    setBusy(false);
    if (ok) setMoveOpen(false);
  };

  const saveNote = async () => {
    setBusy(true);
    const ok = await occurrenceAction(occurrence.id, "note", {
      note: note.trim() ? note.trim() : null,
    });
    setBusy(false);
    if (ok) setNoteOpen(false);
  };

  return (
    <article
      className={cn(
        "card card-interactive relative overflow-hidden",
        compact ? "p-3" : "p-4 sm:p-5",
        skipped && "opacity-68",
        className,
      )}
      style={{ "--habit": colour } as React.CSSProperties}
      aria-label={`${habit.name}, ${occurrenceLabel(occurrence.status)}`}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{
          background: completed
            ? "linear-gradient(var(--success), var(--brand-teal))"
            : `linear-gradient(${colour}, color-mix(in oklch, ${colour} 45%, var(--accent)))`,
        }}
        aria-hidden="true"
      />

      <header className="flex items-start gap-3 pl-1">
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-xl border",
            compact ? "size-9 text-lg" : "size-11 text-xl",
          )}
          style={{
            background: `color-mix(in oklch, ${colour} 14%, transparent)`,
            borderColor: `color-mix(in oklch, ${colour} 26%, transparent)`,
          }}
          aria-hidden="true"
        >
          {habit.icon || "✦"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3
              className={cn(
                "truncate font-bold text-ink",
                compact ? "text-sm" : "text-base",
                completed && "opacity-80",
              )}
            >
              {habit.name}
            </h3>
            <span className={cn("chip", STATUS_STYLES[occurrence.status])}>
              {completed ? <CheckCircle2 className="size-3" /> : null}
              {occurrenceLabel(occurrence.status)}
            </span>
            {occurrence.source === "manual" ? (
              <span className="chip !px-1.5 !py-0 text-[0.6rem]">Added</span>
            ) : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.7rem] text-muted">
            {habit.categoryName ? <span>{habit.categoryName}</span> : null}
            <span className="text-faint">·</span>
            <span>{habit.scheduleLabel}</span>
            {habit.reminderTime ? (
              <>
                <span className="text-faint">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" />
                  {habit.reminderTime}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span
            className="grid size-9 place-items-center rounded-full text-[0.65rem] font-bold tabular-nums"
            style={{
              background: `conic-gradient(${completed ? "var(--success)" : colour} ${occurrence.progress * 360}deg, var(--surface-3) 0)`,
              color: "var(--text)",
            }}
            aria-label={`${percent(occurrence.progress)} of steps complete`}
            title={`${percent(occurrence.progress)} of steps complete`}
          >
            <span className="grid size-7 place-items-center rounded-full bg-[var(--surface-solid)] text-[0.58rem]">
              {percent(occurrence.progress)}
            </span>
          </span>

          <details className="relative">
            <summary
              className="btn btn-ghost btn-icon btn-sm cursor-pointer list-none marker:hidden"
              aria-label={`Actions for ${habit.name}`}
            >
              <MoreHorizontal className="size-4" />
            </summary>
            <div className="card-solid absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-line-strong p-1 shadow-[var(--shadow-lg)]">
              {onEdit ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-soft hover:bg-surface-2 hover:text-ink"
                  onClick={(event) => {
                    (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                    onEdit(occurrence);
                  }}
                >
                  <Pencil className="size-3.5" /> Edit habit
                </button>
              ) : null}
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-soft hover:bg-surface-2 hover:text-ink"
                onClick={(event) => {
                  (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                  setMoveDate(occurrence.date);
                  setMoveOpen(true);
                }}
              >
                <CalendarClock className="size-3.5" /> Move to another day
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-soft hover:bg-surface-2 hover:text-ink"
                onClick={(event) => {
                  (event.currentTarget.closest("details") as HTMLDetailsElement | null)?.removeAttribute("open");
                  setNote(occurrence.note ?? "");
                  setNoteOpen(true);
                }}
              >
                <StickyNote className="size-3.5" /> {occurrence.note ? "Edit note" : "Add note"}
              </button>
              {skipped ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-soft hover:bg-surface-2 hover:text-ink"
                  onClick={() => void occurrenceAction(occurrence.id, "unskip")}
                >
                  <Undo2 className="size-3.5" /> Bring back
                </button>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  onClick={() => void occurrenceAction(occurrence.id, "skip")}
                >
                  <SkipForward className="size-3.5" /> Skip this day
                </button>
              )}
              {occurrence.source === "manual" ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  onClick={() => void deleteOccurrence(occurrence.id)}
                >
                  <Trash2 className="size-3.5" /> Remove from calendar
                </button>
              ) : null}
            </div>
          </details>
        </div>
      </header>

      {occurrence.note ? (
        <p className="mt-2.5 rounded-lg border border-line bg-surface-2/70 px-2.5 py-1.5 text-xs leading-relaxed text-soft">
          {occurrence.note}
        </p>
      ) : null}

      <div className={cn("mt-3 space-y-1 pl-1", compact && "mt-2.5")}>
        {occurrence.steps.map((step) => (
          <div
            key={step.id}
            className="group flex items-center gap-2.5 rounded-lg px-1 py-1 transition-colors hover:bg-surface-2/70"
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={step.checked}
              aria-label={`${step.name}${step.required ? " (required)" : ""}`}
              disabled={pendingStep !== null || skipped}
              onClick={() => void checkStep(step.id, !step.checked)}
              className={cn(
                "check size-5 shrink-0 rounded-md",
                step.checked && "border-transparent bg-[var(--success)] text-white",
              )}
              data-checked={step.checked}
              style={
                !step.checked
                  ? { borderColor: `color-mix(in oklch, ${colour} 45%, var(--border-strong))` }
                  : undefined
              }
            >
              {pendingStep === step.id ? (
                <Spinner size={11} />
              ) : step.checked ? (
                <Check className="size-3" strokeWidth={3} />
              ) : (
                <Circle className="size-2 opacity-0" />
              )}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 text-sm",
                step.checked ? "text-muted line-through decoration-1" : "text-soft",
              )}
            >
              {step.name}
              {!step.required ? (
                <span className="ml-1.5 text-[0.6rem] font-semibold uppercase tracking-wide text-faint">
                  optional
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>

      <TimerControl occurrence={occurrence} compact={compact} className="mt-3" />

      <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-1">
        <p className="text-[0.7rem] font-medium text-muted">
          {occurrence.requiredDone}/{occurrence.requiredSteps} required steps
          {occurrence.timerRequiredMs > 0
            ? occurrence.timerSatisfied
              ? " · timer done"
              : " · timer pending"
            : ""}
        </p>
        <div className="flex items-center gap-1.5">
          {!completed && !skipped && occurrence.canComplete ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={finish}
              disabled={completing}
            >
              {completing ? <Spinner size={13} /> : <CheckCircle2 className="size-3.5" />}
              Complete
            </button>
          ) : null}
          {completed ? (
            <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-[var(--success)]">
              <Check className="size-3.5" /> Done
              {occurrence.completedAt
                ? ` · ${new Date(occurrence.completedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </span>
          ) : null}
        </div>
      </footer>

      <Modal
        open={moveOpen}
        onClose={() => setMoveOpen(false)}
        title={`Move “${habit.name}”`}
        description="Only this occurrence moves. The rest of the schedule and your history stay intact."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setMoveOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={move} disabled={busy}>
              {busy ? <Spinner size={15} /> : null}
              Move to {formatDateLabel(moveDate, { short: true })}
            </button>
          </div>
        }
      >
        <label className="label" htmlFor={`move-${occurrence.id}`}>
          New date
        </label>
        <input
          id={`move-${occurrence.id}`}
          type="date"
          className="input"
          value={moveDate}
          onChange={(event) => setMoveDate(event.target.value)}
        />
      </Modal>

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Note for this day"
        description="Notes are private and travel with this occurrence."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={saveNote} disabled={busy}>
              {busy ? <Spinner size={15} /> : null}
              Save note
            </button>
          </div>
        }
      >
        <label className="label" htmlFor={`note-${occurrence.id}`}>
          Note
        </label>
        <textarea
          id={`note-${occurrence.id}`}
          className="textarea"
          value={note}
          maxLength={1000}
          onChange={(event) => setNote(event.target.value)}
          placeholder="What helped today? What got in the way?"
        />
      </Modal>
    </article>
  );
}

