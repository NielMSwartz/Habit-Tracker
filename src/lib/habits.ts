/**
 * Server-side habit engine.
 *
 * All completion rules live here and are enforced against the database, not
 * only in the UI:
 *   • every required step must be checked;
 *   • a timed habit must have accumulated the required duration;
 *   • unchecking a step re-opens a completed occurrence.
 *
 * Occurrences are generated lazily from the recurrence engine and protected
 * by a unique constraint, so reloading or syncing can never create duplicates.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { addDays, todayKey } from "./dates";
import {
  describeSchedule,
  expandOccurrences,
  normalizeSchedule,
  parseNumberList,
  type Schedule,
} from "./recurrence";
import type {
  HabitDTO,
  OccurrenceDTO,
  OccurrenceStatus,
  StepStateDTO,
  TimerDTO,
  TimerStatus,
} from "./types";

export type HabitWithRelations = Prisma.HabitGetPayload<{
  include: { steps: true; category: true };
}>;

type OccurrenceWithRelations = Prisma.OccurrenceGetPayload<{
  include: {
    habit: { include: { steps: true; category: true } };
    stepCompletions: true;
    timers: true;
  };
}>;

const occurrenceInclude = {
  habit: {
    include: {
      steps: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      category: true,
    },
  },
  stepCompletions: true,
  timers: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OccurrenceInclude;

/** Converts a habit row into the JSON shape used by the browser. */
export function toHabitDTO(habit: HabitWithRelations): HabitDTO {
  const schedule = normalizeSchedule(habit);
  return {
    id: habit.id,
    name: habit.name,
    description: habit.description,
    icon: habit.icon,
    hue: habit.hue,
    categoryId: habit.categoryId,
    categoryName: habit.category?.name ?? null,
    frequency: habit.frequency,
    interval: habit.interval,
    weekdays: parseNumberList(habit.weekdays),
    monthDays: parseNumberList(habit.monthDays),
    startDate: habit.startDate,
    endDate: habit.endDate,
    reminderTime: habit.reminderTime,
    timerMinutes: habit.timerMinutes,
    status: habit.status as HabitDTO["status"],
    sortOrder: habit.sortOrder,
    scheduleLabel: describeSchedule(schedule),
    steps: habit.steps
      .filter((step) => step.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((step) => ({
        id: step.id,
        name: step.name,
        required: step.required,
        sortOrder: step.sortOrder,
      })),
    createdAt: habit.createdAt.toISOString(),
  };
}

/** Computes the remaining time of a timer from its absolute end timestamp. */
export function timerRemainingMs(
  timer: {
    status: string;
    durationMs: number;
    accumulatedMs: number;
    endsAt: Date | null;
  },
  now = Date.now(),
): number {
  if (timer.status === "running" && timer.endsAt) {
    return Math.max(0, timer.endsAt.getTime() - now);
  }
  if (timer.status === "paused") {
    return Math.max(0, timer.durationMs - timer.accumulatedMs);
  }
  return 0;
}

/** Converts a timer row into its client representation. */
export function toTimerDTO(
  timer: {
    id: string;
    habitId: string | null;
    occurrenceId: string | null;
    date: string | null;
    label: string | null;
    durationMs: number;
    accumulatedMs: number;
    status: string;
    endsAt: Date | null;
    startedAt: Date;
    completedAt: Date | null;
  },
  now = Date.now(),
): TimerDTO {
  return {
    id: timer.id,
    habitId: timer.habitId,
    occurrenceId: timer.occurrenceId,
    date: timer.date,
    label: timer.label,
    durationMs: timer.durationMs,
    accumulatedMs: timer.accumulatedMs,
    remainingMs: timerRemainingMs(timer, now),
    status: timer.status as TimerStatus,
    endsAt: timer.endsAt?.toISOString() ?? null,
    startedAt: timer.startedAt.toISOString(),
    completedAt: timer.completedAt?.toISOString() ?? null,
  };
}

/** Builds the effective progress of an occurrence from persisted rows. */
function buildProgress(occurrence: OccurrenceWithRelations) {
  const activeSteps = occurrence.habit.steps.filter((step) => step.active);
  const requiredSteps = activeSteps.filter((step) => step.required);
  const gateSteps = requiredSteps.length > 0 ? requiredSteps : activeSteps;
  const checkedByStep = new Map(
    occurrence.stepCompletions.map((completion) => [
      completion.stepId,
      completion.checkedAt,
    ]),
  );

  const steps: StepStateDTO[] = activeSteps
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((step) => ({
      id: step.id,
      name: step.name,
      required: step.required,
      checked: checkedByStep.has(step.id),
      checkedAt: checkedByStep.get(step.id)?.toISOString() ?? null,
    }));

  const doneSteps = steps.filter((step) => step.checked).length;
  const requiredDone = gateSteps.filter((step) => checkedByStep.has(step.id)).length;
  const allStepsDone =
    gateSteps.length > 0 && gateSteps.every((step) => checkedByStep.has(step.id));
  const timerRequiredMs = occurrence.habit.timerMinutes * 60_000;
  const timerSatisfied =
    timerRequiredMs <= 0 || occurrence.timerMs >= timerRequiredMs;
  const hasProgress = doneSteps > 0 || occurrence.timerMs > 0;

  let status: OccurrenceStatus = "pending";
  if (occurrence.status === "skipped") status = "skipped";
  else if (allStepsDone && timerSatisfied) status = "completed";
  else if (hasProgress) status = "partial";

  return {
    steps,
    doneSteps,
    requiredSteps: gateSteps.length,
    requiredDone,
    allStepsDone,
    timerRequiredMs,
    timerSatisfied,
    canComplete: allStepsDone && timerSatisfied,
    progress: steps.length > 0 ? doneSteps / steps.length : 0,
    status,
  };
}

/** Converts an occurrence row into its client representation. */
export function toOccurrenceDTO(
  occurrence: OccurrenceWithRelations,
  now = Date.now(),
): OccurrenceDTO {
  const progress = buildProgress(occurrence);
  const activeTimer =
    occurrence.timers.find(
      (timer) => timer.status === "running" || timer.status === "paused",
    ) ?? null;

  return {
    id: occurrence.id,
    habitId: occurrence.habitId,
    scheduledDate: occurrence.scheduledDate,
    date: occurrence.date,
    status: progress.status,
    completedAt: occurrence.completedAt?.toISOString() ?? null,
    timerMs: occurrence.timerMs,
    note: occurrence.note,
    source: occurrence.source === "manual" ? "manual" : "schedule",
    habit: toHabitDTO(occurrence.habit),
    steps: progress.steps,
    doneSteps: progress.doneSteps,
    requiredSteps: progress.requiredSteps,
    requiredDone: progress.requiredDone,
    allStepsDone: progress.allStepsDone,
    timerRequiredMs: progress.timerRequiredMs,
    timerSatisfied: progress.timerSatisfied,
    canComplete: progress.canComplete,
    progress: progress.progress,
    timer: activeTimer ? toTimerDTO(activeTimer, now) : null,
  };
}

/**
 * Generates any missing scheduled occurrences for a range.
 *
 * The unique (habitId, scheduledDate) constraint makes this safe to call from
 * any number of screens or devices at once. If a concurrent insert wins, the
 * fallback upsert simply leaves the existing row untouched.
 */
export async function ensureOccurrences(
  userId: string,
  from: string,
  to: string,
): Promise<void> {
  if (to < from) return;
  const habits = await prisma.habit.findMany({
    where: { userId, status: "active" },
    select: {
      id: true,
      frequency: true,
      interval: true,
      weekdays: true,
      monthDays: true,
      startDate: true,
      endDate: true,
    },
  });
  if (habits.length === 0) return;

  const existing = await prisma.occurrence.findMany({
    where: {
      habitId: { in: habits.map((habit) => habit.id) },
      scheduledDate: { gte: from, lte: to },
    },
    select: { habitId: true, scheduledDate: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.habitId}:${row.scheduledDate}`),
  );

  const rows: Prisma.OccurrenceCreateManyInput[] = [];
  for (const habit of habits) {
    const schedule = normalizeSchedule(habit);
    for (const date of expandOccurrences(schedule, from, to)) {
      if (!existingKeys.has(`${habit.id}:${date}`)) {
        rows.push({
          userId,
          habitId: habit.id,
          scheduledDate: date,
          date,
          status: "pending",
          source: "schedule",
        });
      }
    }
  }
  if (rows.length === 0) return;

  try {
    await prisma.occurrence.createMany({ data: rows });
  } catch {
    // A parallel request inserted some of these first. Upsert the rest.
    for (const row of rows) {
      await prisma.occurrence.upsert({
        where: {
          habitId_scheduledDate: {
            habitId: row.habitId,
            scheduledDate: row.scheduledDate,
          },
        },
        create: row,
        update: {},
      });
    }
  }
}

/**
 * Finishes timers whose end timestamp has passed while no tab was open.
 * Their duration is credited to the occurrence exactly once.
 */
export async function settleExpiredTimers(userId: string): Promise<void> {
  const now = new Date();
  const expired = await prisma.timerSession.findMany({
    where: { userId, status: "running", endsAt: { lte: now } },
    select: { id: true, occurrenceId: true, durationMs: true, endsAt: true },
  });

  for (const timer of expired) {
    const updated = await prisma.timerSession.updateMany({
      where: { id: timer.id, status: "running" },
      data: {
        status: "completed",
        accumulatedMs: timer.durationMs,
        completedAt: timer.endsAt ?? now,
      },
    });
    if (updated.count === 0) continue;
    if (timer.occurrenceId) {
      await prisma.occurrence.update({
        where: { id: timer.occurrenceId },
        data: { timerMs: { increment: timer.durationMs } },
      });
      await recalculateOccurrence(timer.occurrenceId, userId);
    }
  }
}

/** Recomputes and persists the status of an occurrence. */
export async function recalculateOccurrence(
  occurrenceId: string,
  userId: string,
): Promise<OccurrenceWithRelations | null> {
  const occurrence = await prisma.occurrence.findFirst({
    where: { id: occurrenceId, userId },
    include: occurrenceInclude,
  });
  if (!occurrence) return null;

  const progress = buildProgress(occurrence);
  const completedAt =
    progress.status === "completed"
      ? (occurrence.completedAt ?? new Date())
      : null;

  await prisma.occurrence.update({
    where: { id: occurrence.id },
    data: { status: progress.status, completedAt },
  });

  return {
    ...occurrence,
    status: progress.status,
    completedAt,
  };
}

/** Loads all occurrences in a range, generating missing scheduled rows. */
export async function loadOccurrences(
  userId: string,
  from: string,
  to: string,
  options: { includeArchived?: boolean } = {},
): Promise<OccurrenceDTO[]> {
  await settleExpiredTimers(userId);
  await ensureOccurrences(userId, from, to);

  const occurrences = await prisma.occurrence.findMany({
    where: {
      userId,
      date: { gte: from, lte: to },
      ...(options.includeArchived
        ? {}
        : { habit: { status: { not: "archived" } } }),
    },
    include: occurrenceInclude,
    orderBy: [{ date: "asc" }, { habit: { sortOrder: "asc" } }],
  });

  const now = Date.now();
  return occurrences.map((occurrence) => toOccurrenceDTO(occurrence, now));
}

/** Loads today's occurrences (plus any active timers) for the dashboard. */
export async function loadToday(
  userId: string,
  timezone: string,
): Promise<OccurrenceDTO[]> {
  const today = todayKey(timezone);
  return loadOccurrences(userId, today, today);
}

/** Finds an occurrence (with all relations) scoped to its owner. */
export async function getOccurrenceForUser(
  occurrenceId: string,
  userId: string,
): Promise<OccurrenceWithRelations | null> {
  return prisma.occurrence.findFirst({
    where: { id: occurrenceId, userId },
    include: occurrenceInclude,
  });
}

/** Error with a user-facing message and HTTP status. */
export class HabitRuleError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "HabitRuleError";
    this.status = status;
  }
}

/**
 * Toggle one step. This never marks the whole habit complete unless all
 * required steps and the timer requirement are satisfied.
 */
export async function toggleStep(params: {
  userId: string;
  occurrenceId: string;
  stepId: string;
  checked: boolean;
}): Promise<OccurrenceDTO> {
  const occurrence = await getOccurrenceForUser(
    params.occurrenceId,
    params.userId,
  );
  if (!occurrence) throw new HabitRuleError("That habit occurrence was not found.", 404);

  const step = occurrence.habit.steps.find(
    (candidate) => candidate.id === params.stepId && candidate.active,
  );
  if (!step) throw new HabitRuleError("That step was not found on this habit.", 404);

  if (params.checked) {
    await prisma.stepCompletion.upsert({
      where: {
        occurrenceId_stepId: {
          occurrenceId: occurrence.id,
          stepId: step.id,
        },
      },
      create: {
        userId: params.userId,
        occurrenceId: occurrence.id,
        stepId: step.id,
      },
      update: { checkedAt: new Date() },
    });
  } else {
    await prisma.stepCompletion.deleteMany({
      where: { occurrenceId: occurrence.id, stepId: step.id },
    });
  }

  const recalculated = await recalculateOccurrence(occurrence.id, params.userId);
  if (!recalculated) throw new HabitRuleError("That occurrence was not found.", 404);
  return toOccurrenceDTO(recalculated);
}

/** Explicit final completion. Enforces both gates server-side. */
export async function completeOccurrence(
  userId: string,
  occurrenceId: string,
): Promise<OccurrenceDTO> {
  const occurrence = await getOccurrenceForUser(occurrenceId, userId);
  if (!occurrence) throw new HabitRuleError("That habit occurrence was not found.", 404);

  const progress = buildProgress(occurrence);
  if (!progress.allStepsDone) {
    throw new HabitRuleError(
      `Finish every required step first (${progress.requiredDone}/${progress.requiredSteps}).`,
      409,
    );
  }
  if (!progress.timerSatisfied) {
    const remaining = progress.timerRequiredMs - occurrence.timerMs;
    throw new HabitRuleError(
      `The timer still needs ${Math.ceil(remaining / 60_000)} more minute(s).`,
      409,
    );
  }

  await prisma.occurrence.update({
    where: { id: occurrence.id },
    data: {
      status: "completed",
      completedAt: occurrence.completedAt ?? new Date(),
    },
  });
  const updated = await getOccurrenceForUser(occurrenceId, userId);
  if (!updated) throw new HabitRuleError("That occurrence was not found.", 404);
  return toOccurrenceDTO(updated);
}

/** Starts (or returns) the active timer for an occurrence. */
export async function startTimer(
  userId: string,
  occurrenceId: string,
): Promise<{ timer: TimerDTO; occurrence: OccurrenceDTO }> {
  const occurrence = await getOccurrenceForUser(occurrenceId, userId);
  if (!occurrence) throw new HabitRuleError("That habit occurrence was not found.", 404);
  if (occurrence.habit.timerMinutes <= 0) {
    throw new HabitRuleError("This habit does not have a timer requirement.", 400);
  }

  const requiredMs = occurrence.habit.timerMinutes * 60_000;
  if (occurrence.timerMs >= requiredMs) {
    throw new HabitRuleError("The timer requirement is already satisfied.", 409);
  }

  const timer = await prisma.$transaction(async (tx) => {
    const existing = await tx.timerSession.findFirst({
      where: {
        userId,
        occurrenceId,
        status: { in: ["running", "paused"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return existing;

    const remainingRequirement = requiredMs - occurrence.timerMs;
    const now = new Date();
    return tx.timerSession.create({
      data: {
        userId,
        habitId: occurrence.habitId,
        occurrenceId,
        date: occurrence.date,
        label: occurrence.habit.name,
        durationMs: remainingRequirement,
        accumulatedMs: 0,
        endsAt: new Date(now.getTime() + remainingRequirement),
        status: "running",
      },
    });
  });

  return {
    timer: toTimerDTO(timer),
    occurrence: toOccurrenceDTO(
      (await getOccurrenceForUser(occurrenceId, userId))!,
    ),
  };
}

/** Pause, resume, stop or finish a timer. */
export async function actOnTimer(params: {
  userId: string;
  timerId: string;
  action: "pause" | "resume" | "stop" | "complete";
}): Promise<{ timer: TimerDTO; occurrence: OccurrenceDTO | null }> {
  const timer = await prisma.timerSession.findFirst({
    where: { id: params.timerId, userId: params.userId },
  });
  if (!timer) throw new HabitRuleError("That timer was not found.", 404);

  const now = new Date();

  if (params.action === "pause") {
    if (timer.status !== "running") {
      throw new HabitRuleError("Only a running timer can be paused.", 409);
    }
    const remaining = Math.max(0, (timer.endsAt?.getTime() ?? now.getTime()) - now.getTime());
    const updated = await prisma.timerSession.update({
      where: { id: timer.id },
      data: {
        status: "paused",
        accumulatedMs: timer.durationMs - remaining,
        endsAt: null,
      },
    });
    return { timer: toTimerDTO(updated), occurrence: null };
  }

  if (params.action === "resume") {
    if (timer.status !== "paused") {
      throw new HabitRuleError("Only a paused timer can be resumed.", 409);
    }
    const remaining = Math.max(0, timer.durationMs - timer.accumulatedMs);
    const updated = await prisma.timerSession.update({
      where: { id: timer.id },
      data: {
        status: "running",
        endsAt: new Date(now.getTime() + remaining),
      },
    });
    return { timer: toTimerDTO(updated), occurrence: null };
  }

  if (params.action === "stop") {
    const remaining = timerRemainingMs(timer, now.getTime());
    const updated = await prisma.timerSession.update({
      where: { id: timer.id },
      data: {
        status: "stopped",
        accumulatedMs: Math.max(0, timer.durationMs - remaining),
        endsAt: null,
      },
    });
    return { timer: toTimerDTO(updated), occurrence: null };
  }

  // Completing a timer is only legal once the persisted end time has passed.
  if (timer.status === "completed") {
    const occurrence = timer.occurrenceId
      ? await getOccurrenceForUser(timer.occurrenceId, params.userId)
      : null;
    return {
      timer: toTimerDTO(timer),
      occurrence: occurrence ? toOccurrenceDTO(occurrence) : null,
    };
  }
  if (timer.status !== "running" || !timer.endsAt) {
    throw new HabitRuleError("That timer is not running.", 409);
  }
  if (timer.endsAt.getTime() > now.getTime() + 2_000) {
    throw new HabitRuleError(
      "The timer has not finished yet. Keep going — refreshing will not skip it.",
      409,
    );
  }

  const updated = await prisma.timerSession.update({
    where: { id: timer.id },
    data: {
      status: "completed",
      accumulatedMs: timer.durationMs,
      completedAt: now,
    },
  });

  if (timer.occurrenceId) {
    await prisma.occurrence.update({
      where: { id: timer.occurrenceId },
      data: { timerMs: { increment: timer.durationMs } },
    });
    await recalculateOccurrence(timer.occurrenceId, params.userId);
  }

  const occurrence = timer.occurrenceId
    ? await getOccurrenceForUser(timer.occurrenceId, params.userId)
    : null;

  return {
    timer: toTimerDTO(updated),
    occurrence: occurrence ? toOccurrenceDTO(occurrence) : null,
  };
}

/** Applies a skip / unskip / reschedule / note action to an occurrence. */
export async function actOnOccurrence(params: {
  userId: string;
  occurrenceId: string;
  action: "skip" | "unskip" | "reschedule" | "note";
  date?: string;
  note?: string | null;
}): Promise<OccurrenceDTO> {
  const occurrence = await getOccurrenceForUser(
    params.occurrenceId,
    params.userId,
  );
  if (!occurrence) throw new HabitRuleError("That habit occurrence was not found.", 404);

  if (params.action === "skip") {
    await prisma.occurrence.update({
      where: { id: occurrence.id },
      data: { status: "skipped", completedAt: null },
    });
  } else if (params.action === "unskip") {
    await prisma.occurrence.update({
      where: { id: occurrence.id },
      data: { status: "pending" },
    });
    await recalculateOccurrence(occurrence.id, params.userId);
  } else if (params.action === "reschedule") {
    if (!params.date) throw new HabitRuleError("Choose a new date.", 400);
    await prisma.occurrence.update({
      where: { id: occurrence.id },
      data: { date: params.date },
    });
  } else {
    await prisma.occurrence.update({
      where: { id: occurrence.id },
      data: { note: params.note ?? null },
    });
  }

  const updated = await getOccurrenceForUser(occurrence.id, params.userId);
  if (!updated) throw new HabitRuleError("That occurrence was not found.", 404);
  return toOccurrenceDTO(updated);
}

/** Creates a manual occurrence for a habit on a specific date. */
export async function addOccurrence(
  userId: string,
  habitId: string,
  date: string,
): Promise<OccurrenceDTO> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    include: { steps: true, category: true },
  });
  if (!habit) throw new HabitRuleError("That habit was not found.", 404);
  if (habit.status === "archived") {
    throw new HabitRuleError("Restore the habit before scheduling it.", 409);
  }

  const existing = await prisma.occurrence.findFirst({
    where: { userId, habitId, date },
    include: occurrenceInclude,
  });
  if (existing) return toOccurrenceDTO(existing);

  const waypoint = await prisma.occurrence.findUnique({
    where: {
      habitId_scheduledDate: { habitId, scheduledDate: date },
    },
    include: occurrenceInclude,
  });
  if (waypoint) {
    if (waypoint.date !== date) {
      await prisma.occurrence.update({
        where: { id: waypoint.id },
        data: { date },
      });
      const moved = await getOccurrenceForUser(waypoint.id, userId);
      return toOccurrenceDTO(moved!);
    }
    return toOccurrenceDTO(waypoint);
  }

  const created = await prisma.occurrence.create({
    data: {
      userId,
      habitId,
      scheduledDate: date,
      date,
      status: "pending",
      source: "manual",
    },
    include: occurrenceInclude,
  });
  return toOccurrenceDTO(created);
}

/** Loads all active timers for a user. */
export async function loadActiveTimers(userId: string): Promise<TimerDTO[]> {
  await settleExpiredTimers(userId);
  const timers = await prisma.timerSession.findMany({
    where: { userId, status: { in: ["running", "paused"] } },
    orderBy: { createdAt: "desc" },
  });
  return timers.map((timer) => toTimerDTO(timer));
}

/**
 * When a habit's schedule or steps change, this removes stale *pending*
 * occurrences and leaves all history (completed, partial, skipped) intact.
 */
export async function reconcileFutureOccurrences(
  userId: string,
  habitId: string,
  from: string,
  to: string,
): Promise<void> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: {
      id: true,
      status: true,
      frequency: true,
      interval: true,
      weekdays: true,
      monthDays: true,
      startDate: true,
      endDate: true,
    },
  });
  if (!habit) return;

  const schedule: Schedule = normalizeSchedule(habit);
  const valid = new Set(
    habit.status === "active" ? expandOccurrences(schedule, from, to) : [],
  );

  const pending = await prisma.occurrence.findMany({
    where: {
      userId,
      habitId,
      date: { gte: from, lte: to },
      status: "pending",
      source: "schedule",
    },
    select: { id: true, scheduledDate: true, date: true },
  });

  const remove = pending
    .filter((occurrence) => !valid.has(occurrence.date))
    .map((occurrence) => occurrence.id);
  if (remove.length > 0) {
    await prisma.occurrence.deleteMany({
      where: { id: { in: remove }, status: "pending" },
    });
  }

  await ensureOccurrences(userId, from, to);
}

/** The default range used when generating an edited habit's future rows. */
export function futureRange(timezone: string, days = 400) {
  const today = todayKey(timezone);
  return { from: today, to: addDays(today, days) };
}
