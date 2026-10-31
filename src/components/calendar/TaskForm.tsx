"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock3, Palette, Save } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { todayKey } from "@/lib/dates";
import type { TaskDTO } from "@/lib/types";
import { taskInputSchema } from "@/lib/validation";

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  defaultDate?: string;
  task?: TaskDTO | null;
}

/** A small one-off task, kept separate from recurring habits. */
export function TaskForm({ open, onClose, defaultDate, task }: TaskFormProps) {
  const { user, categories, createTask, updateTask } = useApp();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(defaultDate ?? todayKey(user.timezone));
  const [time, setTime] = useState("");
  const [hue, setHue] = useState(330);
  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
    setDate(task?.date ?? defaultDate ?? todayKey(user.timezone));
    setTime(task?.time ?? "");
    setHue(task?.hue ?? 330);
    setCategoryId(task?.categoryId ?? "");
    setError(null);
  }, [open, task, defaultDate, user.timezone]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = taskInputSchema.safeParse({
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      date,
      time: time || null,
      hue,
      categoryId: categoryId || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the task details.");
      return;
    }
    setBusy(true);
    try {
      const ok = task
        ? await updateTask(task.id, parsed.data)
        : await createTask(parsed.data);
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={task ? "Edit task" : "Add a task"}
      description="Tasks are one-off items. Habits live separately and repeat."
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn btn-primary" disabled={busy}>
            {busy ? <Spinner size={15} /> : <Save className="size-4" />}
            {task ? "Save task" : "Add task"}
          </button>
        </div>
      }
    >
      <form id="task-form" onSubmit={submit} className="space-y-4">
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-[color-mix(in_oklch,var(--danger)_32%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}

        <div>
          <label className="label" htmlFor="task-title">Title</label>
          <input
            id="task-title"
            className="input"
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Buy compost, book dentist…"
            autoFocus
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="task-date">
              <CalendarDays className="mr-1 inline size-3.5" /> Date
            </label>
            <input
              id="task-date"
              type="date"
              className="input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="task-time">
              <Clock3 className="mr-1 inline size-3.5" /> Time
            </label>
            <input
              id="task-time"
              type="time"
              className="input"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="task-category">Category</label>
          <select
            id="task-category"
            className="select"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Uncategorised</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="task-notes">Notes</label>
          <textarea
            id="task-notes"
            className="textarea min-h-20"
            value={notes}
            maxLength={1000}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Anything you need to remember."
          />
        </div>

        <details className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-soft">
            <Palette className="size-4 text-accent" /> Colour
          </summary>
          <div className="mt-3">
            <ColorPicker hue={hue} onChange={setHue} compact />
          </div>
        </details>
      </form>
    </Modal>
  );
}
