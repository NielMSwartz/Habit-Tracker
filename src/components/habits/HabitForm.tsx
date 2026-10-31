"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  Clock3,
  Layers,
  Palette,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { IconPicker } from "@/components/ui/IconPicker";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { todayKey, weekdayOf } from "@/lib/dates";
import {
  FREQUENCIES,
  frequencyLabel,
  type HabitFrequency,
} from "@/lib/recurrence";
import type { HabitDTO } from "@/lib/types";
import { EMOJI_CHOICES, cn } from "@/lib/ui";
import {
  firstErrorMessage,
  habitInputSchema,
  type HabitInput,
} from "@/lib/validation";

interface StepDraft {
  id?: string;
  name: string;
  required: boolean;
}

interface HabitFormProps {
  open: boolean;
  onClose: () => void;
  habit?: HabitDTO | null;
  defaultDate?: string;
}

const STEPS = [
  { title: "Basics", icon: Sparkles },
  { title: "Schedule", icon: BellRing },
  { title: "Steps & timer", icon: Layers },
] as const;

const WEEKDAYS = [
  { value: 1, label: "M" },
  { value: 2, label: "T" },
  { value: 3, label: "W" },
  { value: 4, label: "T" },
  { value: 5, label: "F" },
  { value: 6, label: "S" },
  { value: 0, label: "S" },
] as const;

export function HabitForm({ open, onClose, habit, defaultDate }: HabitFormProps) {
  const { user, categories, createHabit, updateHabit } = useApp();
  const [stage, setStage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<string>(EMOJI_CHOICES[0]);
  const [hue, setHue] = useState(265);
  const [categoryId, setCategoryId] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [interval, setIntervalValue] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [monthDays, setMonthDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(defaultDate ?? todayKey(user.timezone));
  const [endDate, setEndDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [steps, setSteps] = useState<StepDraft[]>([{ name: "", required: true }]);

  // Reset the form whenever a different habit (or a fresh create) is opened.
  useEffect(() => {
    if (!open) return;
    const today = defaultDate ?? todayKey(user.timezone);
    if (habit) {
      setName(habit.name);
      setDescription(habit.description ?? "");
      setIcon(habit.icon ?? EMOJI_CHOICES[0]);
      setHue(habit.hue);
      setCategoryId(habit.categoryId ?? "");
      setFrequency(habit.frequency as HabitFrequency);
      setIntervalValue(habit.interval);
      setWeekdays(habit.weekdays.length > 0 ? habit.weekdays : [weekdayOf(habit.startDate)]);
      setMonthDays(habit.monthDays);
      setStartDate(habit.startDate);
      setEndDate(habit.endDate ?? "");
      setReminderTime(habit.reminderTime ?? "");
      setTimerMinutes(habit.timerMinutes);
      setSteps(
        habit.steps.length > 0
          ? habit.steps.map((step) => ({
              id: step.id,
              name: step.name,
              required: step.required,
            }))
          : [{ name: "", required: true }],
      );
    } else {
      setName("");
      setDescription("");
      setIcon(EMOJI_CHOICES[0]);
      setHue(265);
      setCategoryId("");
      setFrequency("daily");
      setIntervalValue(1);
      setWeekdays([1, 2, 3, 4, 5]);
      setMonthDays([]);
      setStartDate(today);
      setEndDate("");
      setReminderTime("");
      setTimerMinutes(0);
      setSteps([{ name: "", required: true }]);
    }
    setStage(0);
    setError(null);
  }, [open, habit, defaultDate, user.timezone]);

  const intervalUnit = useMemo(() => {
    switch (frequency) {
      case "daily":
        return "days";
      case "weekly":
      case "weekdays":
        return "weeks";
      case "monthly":
        return "months";
      case "yearly":
        return "years";
      default:
        return "days";
    }
  }, [frequency]);

  const requiredCount = steps.filter((step) => step.required && step.name.trim()).length;
  const totalSteps = steps.filter((step) => step.name.trim()).length;

  const setStep = (index: number, patch: Partial<StepDraft>) => {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step,
      ),
    );
  };

  const addStep = () => {
    setSteps((current) => [...current, { name: "", required: true }]);
  };

  const removeStep = (index: number) => {
    setSteps((current) =>
      current.length === 1 ? current : current.filter((_, stepIndex) => stepIndex !== index),
    );
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleWeekday = (day: number) => {
    setWeekdays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const toggleMonthDay = (day: number) => {
    setMonthDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b),
    );
  };

  const validateStage = (index: number): boolean => {
    if (index === 0) {
      if (!name.trim()) {
        setError("Give your habit a name to continue.");
        return false;
      }
      if (startDate === "" ) {
        setError("Choose a start date.");
        return false;
      }
      if (endDate && endDate < startDate) {
        setError("The end date cannot be before the start date.");
        return false;
      }
    }
    if (index === 1) {
      const today = todayKey(user.timezone);
      if (startDate < today && frequency === "once") {
        setError("A one-off habit needs a date in the future (or today).");
        return false;
      }
      if (frequency === "weekly" && weekdays.length === 0) {
        setError("Pick at least one weekday.");
        return false;
      }
      if (frequency === "monthly" && monthDays.length === 0) {
        setMonthDays([Number(startDate.slice(8, 10))]);
      }
      if (reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(reminderTime)) {
        setError("Use a 24-hour reminder time such as 08:30.");
        return false;
      }
    }
    if (index === 2) {
      if (!steps.some((step) => step.name.trim())) {
        setError("Add at least one step so completion means something.");
        return false;
      }
      if (timerMinutes > 0 && timerMinutes > 1440) {
        setError("Timers can be at most 24 hours.");
        return false;
      }
    }
    setError(null);
    return true;
  };

  const next = () => {
    if (!validateStage(stage)) return;
    setStage((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const back = () => {
    setError(null);
    setStage((current) => Math.max(0, current - 1));
  };

  const submit = async () => {
    if (!validateStage(0) || !validateStage(1) || !validateStage(2)) return;

    const payload: HabitInput = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      icon: icon.trim() ? icon.trim() : null,
      hue,
      categoryId: categoryId || null,
      frequency,
      interval: frequency === "once" || frequency === "weekdays" ? 1 : Math.max(1, interval),
      weekdays: frequency === "weekly" ? weekdays : [],
      monthDays: frequency === "monthly" ? monthDays : [],
      startDate,
      endDate: endDate || null,
      reminderTime: reminderTime || null,
      timerMinutes,
      steps: steps
        .filter((step) => step.name.trim())
        .map((step) => ({
          ...(step.id ? { id: step.id } : {}),
          name: step.name.trim(),
          required: step.required,
        })),
      status: habit?.status === "archived" ? "archived" : (habit?.status ?? "active"),
    };

    const parsed = habitInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(firstErrorMessage(parsed.error));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const ok = habit
        ? await updateHabit(habit.id, { ...parsed.data, scope: "future" })
        : await createHabit(parsed.data);
      if (ok) onClose();
    } finally {
      setSaving(false);
    }
  };

  const StageIcon = STEPS[stage].icon;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={habit ? `Edit ${habit.name}` : "New habit"}
      eyebrow={habit ? "Keep the history, change the plan" : "Small steps, bright colours"}
      description={
        habit
          ? "Schedule changes apply from today. Completed days are preserved exactly as they were."
          : "Give it a name, a rhythm, and a few steps that make done obvious."
      }
      size="lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5">
            {STEPS.map((item, index) => (
              <button
                key={item.title}
                type="button"
                onClick={() => {
                  if (index <= stage || validateStage(stage)) setStage(index);
                }}
                aria-label={`Go to ${item.title}`}
                aria-current={index === stage ? "step" : undefined}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === stage
                    ? "w-7 bg-[var(--accent)]"
                    : index < stage
                      ? "w-2.5 bg-[var(--accent-line)]"
                      : "w-2.5 bg-[var(--surface-3)]",
                )}
              />
            ))}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {stage > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={back} disabled={saving}>
                <ArrowLeft className="size-4" /> Back
              </button>
            ) : (
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
                Cancel
              </button>
            )}
            {stage < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                Continue <ArrowRight className="size-4" />
              </button>
            ) : (
              <button type="button" className="btn btn-brand" onClick={submit} disabled={saving}>
                {saving ? <Spinner size={15} /> : <Save className="size-4" />}
                {habit ? "Save changes" : "Create habit"}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink">
        <span className="grid size-8 place-items-center rounded-xl bg-accent-soft text-accent">
          <StageIcon className="size-4" />
        </span>
        {STEPS[stage].title}
        <span className="text-xs font-normal text-muted">
          Step {stage + 1} of {STEPS.length}
        </span>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-[color-mix(in_oklch,var(--danger)_35%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-xs font-medium text-[var(--danger)]"
        >
          {error}
        </div>
      ) : null}

      {stage === 0 ? (
        <div className="space-y-5">
          <div>
            <label className="label" htmlFor="habit-name">
              Habit name
            </label>
            <input
              id="habit-name"
              className="input"
              value={name}
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
              placeholder="Morning stretch, read 10 pages, water the plants…"
              autoFocus
            />
          </div>

          <div>
            <label className="label" htmlFor="habit-description">
              Notes <span className="font-normal text-faint">(optional)</span>
            </label>
            <textarea
              id="habit-description"
              className="textarea min-h-20"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Why does this matter? What does a good version look like?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="habit-category">
                Category
              </label>
              <select
                id="habit-category"
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
              {categories.length === 0 ? (
                <p className="field-hint">
                  Create categories in Settings to group your habits.
                </p>
              ) : null}
            </div>
            <div>
              <label className="label" htmlFor="habit-icon">
                Icon
              </label>
              <div className="flex items-center gap-2">
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-xl"
                  aria-hidden="true"
                >
                  {icon || "✦"}
                </span>
                <input
                  id="habit-icon"
                  className="input"
                  value={icon}
                  maxLength={8}
                  onChange={(event) => setIcon(event.target.value)}
                  placeholder="🌱"
                />
              </div>
            </div>
          </div>

          <div className="panel p-3.5">
            <ColorPicker hue={hue} onChange={setHue} label="Habit colour" compact />
            <div className="mt-3 flex items-center gap-2">
              <Palette className="size-3.5 text-muted" />
              <span className="text-xs text-muted">
                This colour tints the card, heatmap and charts everywhere.
              </span>
            </div>
          </div>

          <details className="rounded-xl border border-line bg-surface-2/60 px-3.5 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-soft">
              <span className="grid size-7 place-items-center rounded-lg bg-accent-soft text-accent">
                <Sparkles className="size-3.5" />
              </span>
              More icon ideas
            </summary>
            <div className="mt-3">
              <IconPicker value={icon} onChange={setIcon} />
            </div>
          </details>
        </div>
      ) : null}

      {stage === 1 ? (
        <div className="space-y-5">
          <div>
            <span className="label">How often?</span>
            <div className="flex flex-wrap gap-1.5">
              {FREQUENCIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFrequency(option)}
                  aria-pressed={frequency === option}
                  className={cn(
                    "chip chip-interactive !px-3 !py-1.5 !text-xs",
                    frequency === option && "!border-[var(--accent-line)] !bg-[var(--accent-soft)] !text-[var(--accent)]",
                  )}
                >
                  {frequencyLabel(option)}
                </button>
              ))}
            </div>
          </div>

          {frequency !== "once" && frequency !== "weekdays" ? (
            <div className="panel flex flex-wrap items-center gap-3 p-3.5">
              <span className="text-sm font-medium text-soft">Repeat every</span>
              <input
                type="number"
                min={1}
                max={999}
                value={interval}
                onChange={(event) =>
                  setIntervalValue(Math.max(1, Math.min(999, Number(event.target.value) || 1)))
                }
                className="input !w-20 !min-h-9 text-center"
                aria-label={`Interval in ${intervalUnit}`}
              />
              <span className="text-sm text-muted">{intervalUnit}</span>
            </div>
          ) : null}

          {frequency === "weekly" ? (
            <div>
              <span className="label">Which days?</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((day, index) => {
                  const active = weekdays.includes(day.value);
                  return (
                    <button
                      key={`${day.value}-${index}`}
                      type="button"
                      onClick={() => toggleWeekday(day.value)}
                      aria-pressed={active}
                      className={cn(
                        "grid size-10 place-items-center rounded-xl border text-sm font-bold transition-all",
                        active
                          ? "border-transparent bg-[var(--accent)] text-[var(--accent-ink)] shadow-[var(--shadow-accent)]"
                          : "border-line bg-surface-2 text-muted hover:border-line-strong",
                      )}
                      aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.value]}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {frequency === "weekdays" ? (
            <p className="field-hint">
              Scheduled Monday to Friday every week, with weekends off automatically.
            </p>
          ) : null}

          {frequency === "monthly" ? (
            <div>
              <span className="label">Days of the month</span>
              <div className="grid grid-cols-8 gap-1 sm:grid-cols-11">
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => {
                  const active = monthDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleMonthDay(day)}
                      aria-pressed={active}
                      className={cn(
                        "grid aspect-square place-items-center rounded-lg border text-[0.7rem] font-semibold transition-all",
                        active
                          ? "border-transparent bg-[var(--accent)] text-[var(--accent-ink)]"
                          : "border-line bg-surface-2 text-muted hover:border-line-strong",
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <p className="field-hint">
                Short months use their last day when the chosen day does not exist.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="habit-start">
                Starts
              </label>
              <input
                id="habit-start"
                type="date"
                className="input"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="habit-end">
                Ends <span className="font-normal text-faint">(optional)</span>
              </label>
              <input
                id="habit-end"
                type="date"
                className="input"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="habit-reminder">
                Reminder <span className="font-normal text-faint">(optional)</span>
              </label>
              <div className="relative">
                <Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
                <input
                  id="habit-reminder"
                  type="time"
                  className="input pl-9"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.target.value)}
                />
              </div>
              <p className="field-hint">
                In-app reminders use your timezone ({user.timezone}).
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-2/70 p-3.5">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <BellRing className="size-4 text-accent" /> Plan preview
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {frequency === "once"
                  ? `One occurrence on ${startDate}.`
                  : frequency === "weekly"
                    ? `Weekly on ${weekdays
                        .map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day])
                        .join(", ") || "no days yet"}.`
                    : frequency === "monthly"
                      ? `Monthly on ${monthDays.join(", ") || Number(startDate.slice(8, 10))}.`
                      : `${frequencyLabel(frequency)}${interval > 1 ? ` every ${interval} ${intervalUnit}` : ""}${
                          endDate ? ` until ${endDate}` : " with no end date"
                        }.`}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {stage === 2 ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="label !mb-0">Checklist steps</span>
              <p className="field-hint !mt-1">
                Every <strong>required</strong> step must be checked before the habit can
                complete. Optional steps are extra credit.
              </p>
            </div>
            <span className="chip">
              {requiredCount} required · {totalSteps} total
            </span>
          </div>

          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id ?? `new-${index}`}
                className="flex items-start gap-2 rounded-xl border border-line bg-surface-2/70 p-2"
              >
                <span className="mt-2 grid size-5 shrink-0 place-items-center rounded-md bg-surface-3 text-[0.6rem] font-bold text-muted">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    className="input !min-h-9 !py-1.5 text-sm"
                    value={step.name}
                    maxLength={120}
                    placeholder={index === 0 ? "e.g. Fill the water bottle" : "Another step"}
                    onChange={(event) => setStep(index, { name: event.target.value })}
                    aria-label={`Step ${index + 1} name`}
                  />
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-[0.7rem] font-medium text-muted">
                    <input
                      type="checkbox"
                      className="size-3.5 accent-[var(--accent)]"
                      checked={step.required}
                      onChange={(event) => setStep(index, { required: event.target.checked })}
                    />
                    Required for completion
                  </label>
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm !size-7"
                    onClick={() => moveStep(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${step.name || "step"} up`}
                  >
                    <ChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm !size-7"
                    onClick={() => moveStep(index, 1)}
                    disabled={index === steps.length - 1}
                    aria-label={`Move ${step.name || "step"} down`}
                  >
                    <ChevronDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm !size-7 text-[var(--danger)]"
                    onClick={() => removeStep(index)}
                    disabled={steps.length === 1}
                    aria-label="Remove step"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm w-full border-dashed"
            onClick={addStep}
            disabled={steps.length >= 60}
          >
            <CirclePlus className="size-4" /> Add another step
          </button>

          <div className="panel p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">Focus timer</p>
                <p className="mt-0.5 text-xs text-muted">
                  Optional. Completion is blocked until this much time is actually recorded.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={1440}
                  step={5}
                  value={timerMinutes}
                  onChange={(event) =>
                    setTimerMinutes(Math.max(0, Math.min(1440, Number(event.target.value) || 0)))
                  }
                  className="input !w-24 !min-h-9 text-center"
                  aria-label="Timer minutes"
                />
                <span className="text-xs font-medium text-muted">minutes</span>
              </div>
            </div>
            {timerMinutes > 0 ? (
              <p className="mt-2 flex items-center gap-1.5 text-[0.7rem] font-medium text-accent">
                <Clock3 className="size-3.5" />
                {timerMinutes} minutes of focus are required for each occurrence.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <Check className="size-4 text-accent" /> Ready to grow
            </p>
            <p className="mt-1 text-xs leading-relaxed text-soft">
              {name.trim() ? `“${name.trim()}”` : "Your habit"} will be added to your
              dashboard and calendar with {totalSteps || 0} step
              {totalSteps === 1 ? "" : "s"}
              {timerMinutes > 0 ? ` and a ${timerMinutes}-minute focus timer` : ""}.
            </p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
