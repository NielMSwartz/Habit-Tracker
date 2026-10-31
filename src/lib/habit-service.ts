import { prisma } from "./db";
import { addDays, todayKey } from "./dates";
import {
  ensureOccurrences,
  futureRange,
  HabitRuleError,
  reconcileFutureOccurrences,
  recalculateOccurrence,
  toHabitDTO,
} from "./habits";
import { normalizeSchedule } from "./recurrence";
import type { HabitDTO } from "./types";
import type { HabitInput, HabitPatch } from "./validation";

async function assertCategory(userId: string, categoryId: string | null | undefined) {
  if (!categoryId) return null;
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  if (!category) throw new HabitRuleError("That category was not found.", 404);
  return category.id;
}

function validateDates(startDate: string, endDate: string | null | undefined) {
  if (endDate && endDate < startDate) {
    throw new HabitRuleError("The end date cannot be before the start date.", 422);
  }
}

/** Creates a habit and generates its upcoming scheduled occurrences. */
export async function createHabit(
  userId: string,
  timezone: string,
  input: HabitInput,
): Promise<HabitDTO> {
  validateDates(input.startDate, input.endDate);
  const categoryId = await assertCategory(userId, input.categoryId);
  const schedule = normalizeSchedule({
    frequency: input.frequency,
    interval: input.interval,
    weekdays: JSON.stringify(input.weekdays),
    monthDays: JSON.stringify(input.monthDays),
    startDate: input.startDate,
    endDate: input.endDate ?? null,
  });

  const habit = await prisma.habit.create({
    data: {
      userId,
      categoryId,
      name: input.name,
      description: input.description ?? null,
      icon: input.icon ?? null,
      hue: input.hue,
      frequency: schedule.frequency,
      interval: schedule.interval,
      weekdays: JSON.stringify(input.weekdays),
      monthDays: JSON.stringify(input.monthDays),
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      reminderTime: input.reminderTime ?? null,
      timerMinutes: input.timerMinutes,
      status: input.status,
      steps: {
        create: input.steps.map((step, index) => ({
          name: step.name,
          required: step.required,
          sortOrder: index,
        })),
      },
    },
    include: { steps: true, category: true },
  });

  const today = todayKey(timezone);
  const from = input.startDate < addDays(today, -365) ? addDays(today, -365) : input.startDate;
  await ensureOccurrences(userId, from, addDays(today, 400)).catch(() => undefined);

  return toHabitDTO(habit);
}

/** Updates a habit, preserving all historical completion rows. */
export async function updateHabit(
  userId: string,
  timezone: string,
  habitId: string,
  patch: HabitPatch,
): Promise<{ habit: HabitDTO; occurrenceDate?: string }> {
  const existing = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    include: { steps: true, category: true },
  });
  if (!existing) throw new HabitRuleError("That habit was not found.", 404);

  // "Only this occurrence" edits move the selected occurrence; the habit and
  // all future occurrences keep their schedule.
  if (patch.scope === "this") {
    if (!patch.occurrenceDate || !patch.newDate) {
      throw new HabitRuleError("Choose the occurrence and its new date.", 422);
    }
    const occurrence = await prisma.occurrence.findFirst({
      where: { habitId, userId, date: patch.occurrenceDate },
    });
    if (!occurrence) {
      throw new HabitRuleError("That occurrence was not found.", 404);
    }
    await prisma.occurrence.update({
      where: { id: occurrence.id },
      data: { date: patch.newDate },
    });
    return { habit: toHabitDTO(existing), occurrenceDate: patch.newDate };
  }

  validateDates(
    patch.startDate ?? existing.startDate,
    patch.endDate === undefined ? existing.endDate : patch.endDate,
  );
  const categoryId =
    patch.categoryId === undefined
      ? existing.categoryId
      : await assertCategory(userId, patch.categoryId);

  const nextFrequency = patch.frequency ?? existing.frequency;
  const nextInterval = patch.interval ?? existing.interval;

  const data: Parameters<typeof prisma.habit.update>[0]["data"] = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined
      ? { description: patch.description }
      : {}),
    ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
    ...(patch.hue !== undefined ? { hue: patch.hue } : {}),
    ...(patch.categoryId !== undefined ? { categoryId } : {}),
    frequency: nextFrequency,
    interval: nextInterval,
    ...(patch.weekdays !== undefined
      ? { weekdays: JSON.stringify(patch.weekdays) }
      : {}),
    ...(patch.monthDays !== undefined
      ? { monthDays: JSON.stringify(patch.monthDays) }
      : {}),
    ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
    ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
    ...(patch.reminderTime !== undefined
      ? { reminderTime: patch.reminderTime }
      : {}),
    ...(patch.timerMinutes !== undefined
      ? { timerMinutes: patch.timerMinutes }
      : {}),
    ...(patch.status !== undefined
      ? {
          status: patch.status,
          archivedAt: patch.status === "archived" ? new Date() : null,
        }
      : {}),
  };

  // Steps: update in place, add new ones, deactivate removed ones. Historic
  // StepCompletion rows are never deleted here.
  if (patch.steps) {
    const existingIds = new Set(existing.steps.map((step) => step.id));
    const keep = new Set<string>();
    for (let index = 0; index < patch.steps.length; index += 1) {
      const step = patch.steps[index];
      if (step.id && existingIds.has(step.id)) {
        keep.add(step.id);
        await prisma.habitStep.update({
          where: { id: step.id },
          data: { name: step.name, required: step.required, sortOrder: index, active: true },
        });
      } else {
        const created = await prisma.habitStep.create({
          data: {
            habitId,
            name: step.name,
            required: step.required,
            sortOrder: index,
          },
        });
        keep.add(created.id);
      }
    }
    await prisma.habitStep.updateMany({
      where: { habitId, id: { notIn: [...keep] }, active: true },
      data: { active: false },
    });
  }

  await prisma.habit.update({ where: { id: habitId }, data });

  const today = todayKey(timezone);
  if (patch.status === "archived" || patch.status === "paused") {
    await prisma.occurrence.deleteMany({
      where: {
        habitId,
        userId,
        status: "pending",
        date: { gte: today },
      },
    });
  }
  if (patch.status === "active" || patch.status === undefined) {
    if (
      patch.frequency !== undefined ||
      patch.interval !== undefined ||
      patch.weekdays !== undefined ||
      patch.monthDays !== undefined ||
      patch.startDate !== undefined ||
      patch.endDate !== undefined ||
      patch.status === "active"
    ) {
      await reconcileFutureOccurrences(userId, habitId, today, addDays(today, 400));
    }
  }

  // A change to the steps can re-open today's incomplete occurrence. History
  // before today is deliberately left untouched.
  if (patch.steps) {
    const affected = await prisma.occurrence.findMany({
      where: { habitId, userId, date: { gte: today } },
      select: { id: true },
      take: 400,
    });
    for (const occurrence of affected) {
      await recalculateOccurrence(occurrence.id, userId);
    }
  }

  const updated = await prisma.habit.findFirstOrThrow({
    where: { id: habitId, userId },
    include: { steps: true, category: true },
  });
  return { habit: toHabitDTO(updated) };
}

/** Archives a habit by default. `permanent` removes it and its history. */
export async function removeHabit(
  userId: string,
  timezone: string,
  habitId: string,
  permanent: boolean,
): Promise<{ archived: boolean; deleted: boolean }> {
  const habit = await prisma.habit.findFirst({
    where: { id: habitId, userId },
    select: { id: true },
  });
  if (!habit) throw new HabitRuleError("That habit was not found.", 404);

  if (permanent) {
    await prisma.habit.delete({ where: { id: habitId } });
    return { archived: false, deleted: true };
  }

  await prisma.habit.update({
    where: { id: habitId },
    data: { status: "archived", archivedAt: new Date() },
  });
  const today = todayKey(timezone);
  await prisma.occurrence.deleteMany({
    where: {
      habitId,
      userId,
      status: "pending",
      date: { gte: today },
    },
  });
  return { archived: true, deleted: false };
}

/** Convenience used by the calendar "add to this day" action. */
export function defaultFutureWindow(timezone: string) {
  return futureRange(timezone);
}
