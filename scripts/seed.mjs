#!/usr/bin/env node
/**
 * scripts/seed.mjs
 * ---------------------------------------------------------------------------
 * Creates a demo account with realistic, deterministic history:
 *
 *   • one user        — demo@chromatic.app / demo1234
 *   • five categories — Health, Learning, Mind, Work, Home
 *   • seven habits    — multi-step routines with timers and schedules
 *   • ~3 months of occurrences, step completions, partials and misses
 *   • one-off tasks   — completed, due today and coming up
 *
 * Running it twice is safe: the demo user is deleted first and every related
 * row cascades with it.
 *
 * Usage:
 *
 *     npm run db:seed
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

/** Absolute path to the project root (the folder holding package.json). */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Reads a `.env` style file without overwriting real environment values. */
function loadEnvFile(fileName) {
  let content;
  try {
    content = readFileSync(join(ROOT, fileName), "utf8");
  } catch {
    return;
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");
    process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.db";
}

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@chromatic.app";
const DEMO_PASSWORD = "demo1234";
const TIMEZONE = "Europe/Amsterdam";

/** Deterministic PRNG so the charts look the same on every machine. */
function mulberry32(seed) {
  let value = seed;
  return function random() {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(20261028);

/** Today's date key in the demo account's timezone. */
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Adds days to a date key. */
function addDays(key, days) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days between two date keys. */
function daysBetween(from, to) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Monday-based start of the week for a date key. */
function startOfWeek(key) {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay();
  const offset = (weekday + 6) % 7;
  return addDays(key, -offset);
}

/** The month index (year * 12 + month) of a date key. */
function monthIndex(key) {
  const date = new Date(`${key}T00:00:00Z`);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function daysInMonth(key) {
  const date = new Date(`${key}T00:00:00Z`);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

/** Mirrors the recurrence rules used by the application. */
function occursOn(habit, date) {
  if (date < habit.startDate) return false;
  if (habit.endDate && date > habit.endDate) return false;

  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const day = new Date(`${date}T00:00:00Z`).getUTCDate();

  switch (habit.frequency) {
    case "once":
      return date === habit.startDate;
    case "daily": {
      const elapsed = daysBetween(habit.startDate, date);
      return elapsed >= 0 && elapsed % habit.interval === 0;
    }
    case "weekdays": {
      if (weekday === 0 || weekday === 6) return false;
      const weeks = Math.round(
        daysBetween(startOfWeek(habit.startDate), startOfWeek(date)) / 7,
      );
      return weeks >= 0 && weeks % habit.interval === 0;
    }
    case "weekly": {
      const days =
        habit.weekdays.length > 0
          ? habit.weekdays
          : [new Date(`${habit.startDate}T00:00:00Z`).getUTCDay()];
      if (!days.includes(weekday)) return false;
      const weeks = Math.round(
        daysBetween(startOfWeek(habit.startDate), startOfWeek(date)) / 7,
      );
      return weeks >= 0 && weeks % habit.interval === 0;
    }
    case "monthly": {
      const days =
        habit.monthDays.length > 0 ? habit.monthDays : [new Date(`${habit.startDate}T00:00:00Z`).getUTCDate()];
      const last = daysInMonth(date);
      const matches = days.some((rule) => (rule > last ? day === last : day === rule));
      if (!matches) return false;
      const months = monthIndex(date) - monthIndex(habit.startDate);
      return months >= 0 && months % habit.interval === 0;
    }
    case "yearly": {
      const start = new Date(`${habit.startDate}T00:00:00Z`);
      const years = new Date(`${date}T00:00:00Z`).getUTCFullYear() - start.getUTCFullYear();
      if (years < 0 || years % habit.interval !== 0) return false;
      if (new Date(`${date}T00:00:00Z`).getUTCMonth() !== start.getUTCMonth()) return false;
      const target = Math.min(start.getUTCDate(), daysInMonth(date));
      return day === target;
    }
    default:
      return false;
  }
}

const CATEGORIES = [
  { name: "Health", hue: 152 },
  { name: "Learning", hue: 275 },
  { name: "Mind", hue: 330 },
  { name: "Work", hue: 208 },
  { name: "Home", hue: 95 },
];

const HABITS = [
  {
    name: "Morning grounding",
    description: "Start slowly and on purpose.",
    icon: "🌱",
    hue: 152,
    category: "Health",
    frequency: "daily",
    interval: 1,
    weekdays: [],
    monthDays: [],
    timerMinutes: 5,
    reminderTime: "07:30",
    diligence: 0.84,
    steps: [
      { name: "Drink a glass of water", required: true },
      { name: "Stretch for five minutes", required: true },
      { name: "Write one intention", required: true },
      { name: "Make the bed", required: false },
    ],
  },
  {
    name: "Read 20 pages",
    description: "Any book counts. Phone in another room.",
    icon: "📚",
    hue: 275,
    category: "Learning",
    frequency: "daily",
    interval: 1,
    weekdays: [],
    monthDays: [],
    timerMinutes: 20,
    reminderTime: "21:00",
    diligence: 0.68,
    steps: [
      { name: "Put the phone away", required: true },
      { name: "Read 20 pages", required: true },
      { name: "Note one idea", required: false },
    ],
  },
  {
    name: "Strength training",
    description: "Warm up, lift, stretch — in that order.",
    icon: "💪",
    hue: 25,
    category: "Health",
    frequency: "weekly",
    interval: 1,
    weekdays: [1, 3, 5],
    monthDays: [],
    timerMinutes: 45,
    reminderTime: "18:00",
    diligence: 0.73,
    steps: [
      { name: "Warm up for 8 minutes", required: true },
      { name: "Complete the main set", required: true },
      { name: "Stretch and cool down", required: true },
      { name: "Log the weights", required: false },
    ],
  },
  {
    name: "Meditate",
    description: "Ten quiet minutes without a screen.",
    icon: "🧘",
    hue: 330,
    category: "Mind",
    frequency: "daily",
    interval: 1,
    weekdays: [],
    monthDays: [],
    timerMinutes: 10,
    reminderTime: "08:00",
    diligence: 0.56,
    steps: [
      { name: "Sit somewhere quiet", required: true },
      { name: "Breathe for ten minutes", required: true },
    ],
  },
  {
    name: "Inbox zero",
    description: "Triage, archive, plan tomorrow.",
    icon: "💻",
    hue: 208,
    category: "Work",
    frequency: "weekdays",
    interval: 1,
    weekdays: [],
    monthDays: [],
    timerMinutes: 0,
    reminderTime: "16:30",
    diligence: 0.64,
    steps: [
      { name: "Triage new mail", required: true },
      { name: "Archive what is done", required: true },
      { name: "Write tomorrow's top three", required: true },
    ],
  },
  {
    name: "Deep clean the kitchen",
    description: "Once a month, properly.",
    icon: "🧹",
    hue: 95,
    category: "Home",
    frequency: "monthly",
    interval: 1,
    weekdays: [],
    monthDays: [1],
    timerMinutes: 60,
    reminderTime: "10:00",
    diligence: 0.77,
    steps: [
      { name: "Clear every surface", required: true },
      { name: "Wipe appliances", required: true },
      { name: "Mop the floor", required: true },
    ],
  },
  {
    name: "Weekly review",
    description: "Close the week and choose what matters next.",
    icon: "✍️",
    hue: 285,
    category: "Work",
    frequency: "weekly",
    interval: 1,
    weekdays: [0],
    monthDays: [],
    timerMinutes: 30,
    reminderTime: "17:00",
    diligence: 0.61,
    steps: [
      { name: "Review the week's wins", required: true },
      { name: "Choose three priorities", required: true },
      { name: "Schedule them", required: true },
    ],
  },
];

const TASKS = [
  {
    title: "Send the project update",
    notes: "Keep it to five bullets.",
    dateOffset: 0,
    time: "09:30",
    hue: 208,
    category: "Work",
    completed: true,
  },
  {
    title: "Buy oat milk and coffee",
    notes: null,
    dateOffset: 0,
    time: "17:30",
    hue: 95,
    category: "Home",
    completed: false,
  },
  {
    title: "Call the dentist",
    notes: "Ask about the check-up on Friday.",
    dateOffset: 0,
    time: "11:00",
    hue: 152,
    category: "Health",
    completed: false,
  },
  {
    title: "Return the parcel",
    notes: null,
    dateOffset: -2,
    time: "13:00",
    hue: 25,
    category: "Home",
    completed: true,
  },
  {
    title: "Renew library books",
    notes: null,
    dateOffset: 1,
    time: "10:00",
    hue: 275,
    category: "Learning",
    completed: false,
  },
  {
    title: "Plan the weekend hike",
    notes: "Check the weather on Friday.",
    dateOffset: 3,
    time: "19:00",
    hue: 330,
    category: "Mind",
    completed: false,
  },
  {
    title: "Dentist appointment",
    notes: null,
    dateOffset: 6,
    time: "09:15",
    hue: 152,
    category: "Health",
    completed: false,
  },
];

/** Timestamps for a date key, kept stable for a deterministic seed. */
function timestampFor(date, hour = 19, minute = 0) {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`);
}

async function main() {
  console.log("[seed] removing any previous demo account…");
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  console.log("[seed] creating the demo user…");
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo User",
      passwordHash: await hash(DEMO_PASSWORD, 10),
      timezone: TIMEZONE,
      weekStartsOn: 1,
      theme: "system",
      accentHue: 265,
      defaultCalendarView: "month",
      notification: {
        create: {
          inApp: true,
          browser: false,
          reminderLeadMinutes: 5,
          quietFrom: "22:30",
          quietUntil: "07:00",
        },
      },
    },
  });

  console.log("[seed] creating categories…");
  const categories = new Map();
  for (const definition of CATEGORIES) {
    const category = await prisma.category.create({
      data: { userId: user.id, name: definition.name, hue: definition.hue },
    });
    categories.set(definition.name, category);
  }

  const today = todayKey();
  const startDate = addDays(today, -84);

  console.log("[seed] creating habits and steps…");
  const habits = [];
  for (const [index, definition] of HABITS.entries()) {
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        categoryId: categories.get(definition.category)?.id ?? null,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        hue: definition.hue,
        frequency: definition.frequency,
        interval: definition.interval,
        weekdays: JSON.stringify(definition.weekdays),
        monthDays: JSON.stringify(definition.monthDays),
        startDate,
        reminderTime: definition.reminderTime,
        timerMinutes: definition.timerMinutes,
        status: "active",
        sortOrder: index,
        steps: {
          create: definition.steps.map((step, stepIndex) => ({
            name: step.name,
            required: step.required,
            sortOrder: stepIndex,
          })),
        },
      },
      include: { steps: { orderBy: { sortOrder: "asc" } } },
    });

    habits.push({
      ...habit,
      weekdays: definition.weekdays,
      monthDays: definition.monthDays,
      diligence: definition.diligence,
      steps: habit.steps,
    });
  }

  console.log("[seed] writing three months of history…");
  let occurrences = 0;
  let completions = 0;

  for (const [index, habit] of habits.entries()) {
    for (let offset = 84; offset >= 0; offset -= 1) {
      const date = addDays(today, -offset);
      if (!occursOn(habit, date)) continue;

      // Older days are slightly weaker; recent days show a rising curve.
      const recency = 1 - offset / 168;
      const chance = Math.min(0.94, habit.diligence * (0.82 + recency * 0.28));
      const roll = random();

      let status = "pending";
      let checkedSteps = [];
      let timerMs = 0;
      let completedAt = null;

      const isToday = offset === 0;

      if (isToday && index === 0) {
        status = "completed";
      } else if (isToday && index === 1) {
        // Leave a visible work-in-progress for the demo.
        status = "partial";
        checkedSteps = habit.steps.slice(0, 1);
      } else if (isToday && index === 3) {
        status = "pending";
      } else if (roll < chance) {
        status = "completed";
      } else if (roll < chance + 0.08) {
        status = "partial";
        const required = habit.steps.filter((step) => step.required);
        const count = Math.max(1, required.length - 1);
        checkedSteps = required.slice(0, count);
      } else if (roll < chance + 0.12) {
        status = "skipped";
      }

      if (status === "completed") {
        checkedSteps = habit.steps;
        timerMs = habit.timerMinutes * 60_000;
        completedAt = timestampFor(date, 19, Math.min(58, index * 7));
      } else if (status === "partial") {
        timerMs = Math.round(habit.timerMinutes * 60_000 * 0.4);
      }

      await prisma.occurrence.create({
        data: {
          userId: user.id,
          habitId: habit.id,
          scheduledDate: date,
          date,
          status,
          completedAt,
          timerMs,
          note:
            status === "completed" && index === 2 && offset === 3
              ? "Added five kilos to the squat. Felt solid."
              : null,
          source: "schedule",
          stepCompletions:
            checkedSteps.length > 0
              ? {
                  create: checkedSteps.map((step, stepIndex) => ({
                    userId: user.id,
                    stepId: step.id,
                    checkedAt: timestampFor(date, 18, Math.min(59, stepIndex * 9)),
                  })),
                }
              : undefined,
        },
      });

      occurrences += 1;
      completions += checkedSteps.length;
    }
  }

  console.log("[seed] adding one-off tasks…");
  await prisma.task.createMany({
    data: TASKS.map((task) => {
      const date = addDays(today, task.dateOffset);
      return {
        userId: user.id,
        categoryId: categories.get(task.category)?.id ?? null,
        title: task.title,
        notes: task.notes,
        date,
        time: task.time,
        hue: task.hue,
        completed: task.completed,
        completedAt: task.completed ? timestampFor(date, 12, 0) : null,
      };
    }),
  });

  console.log(
    `\n[seed] done — ${habits.length} habits, ${occurrences} occurrences, ${completions} step completions, ${TASKS.length} tasks.\n` +
      `        Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`,
  );
}

main()
  .catch((error) => {
    console.error("[seed] failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
