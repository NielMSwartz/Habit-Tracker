/**
 * Input validation shared by the API routes and the client forms.
 *
 * Keeping the schemas here means the browser can show the same helpful message
 * the server would return, and the server still validates every request.
 */

import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 8;

export const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 08:30");

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "That calendar date does not exist");

export const frequencySchema = z.enum([
  "once",
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
]);

export const hueSchema = z.number().int().min(0).max(359);

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid e-mail address").max(254),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid e-mail address"),
  password: z.string().min(1, "Enter your password"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid e-mail address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, "This reset link is incomplete"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(200),
});

export const stepInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Give the step a name").max(120),
  required: z.boolean().default(true),
});

/**
 * Fields without defaults. Defaults belong only to creation: a PATCH that
 * used `.partial()` on a defaulted schema would materialise every default and
 * silently reset fields the client never sent (e.g. clearing a habit's timer
 * when only renaming it).
 */
const habitFields = {
  name: z.string().trim().min(1, "Give the habit a name").max(120),
  description: z.string().trim().max(1000).nullable(),
  icon: z.string().trim().max(40).nullable(),
  hue: hueSchema,
  categoryId: z.string().min(1).nullable(),
  frequency: frequencySchema,
  interval: z.number().int().min(1).max(999),
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  monthDays: z.array(z.number().int().min(1).max(31)).max(31),
  startDate: dateKeySchema,
  endDate: dateKeySchema.nullable(),
  reminderTime: timeOfDaySchema.nullable(),
  timerMinutes: z.number().int().min(0).max(1440),
  steps: z.array(stepInputSchema).min(1, "Add at least one step").max(60),
  status: z.enum(["active", "paused", "archived"]),
};

export const habitInputSchema = z.object({
  ...habitFields,
  description: habitFields.description.optional(),
  icon: habitFields.icon.optional(),
  categoryId: habitFields.categoryId.optional(),
  endDate: habitFields.endDate.optional(),
  reminderTime: habitFields.reminderTime.optional(),
  hue: hueSchema.default(210),
  frequency: frequencySchema.default("daily"),
  interval: habitFields.interval.default(1),
  weekdays: habitFields.weekdays.default([]),
  monthDays: habitFields.monthDays.default([]),
  timerMinutes: habitFields.timerMinutes.default(0),
  status: habitFields.status.default("active"),
});

export const habitPatchSchema = z.object(habitFields).partial().extend({
  /** "future" updates the schedule; "this" only moves the selected occurrence. */
  scope: z.enum(["future", "this"]).optional(),
  occurrenceDate: dateKeySchema.optional(),
  newDate: dateKeySchema.optional(),
});

export const stepToggleSchema = z.object({
  occurrenceId: z.string().min(1),
  stepId: z.string().min(1),
  checked: z.boolean(),
  /** Client-generated id makes retried offline mutations idempotent. */
  clientMutationId: z.string().max(100).optional(),
});

export const completeOccurrenceSchema = z.object({
  occurrenceId: z.string().min(1),
});

export const occurrenceActionSchema = z.object({
  occurrenceId: z.string().min(1),
  action: z.enum(["skip", "unskip", "reschedule", "note"]),
  date: dateKeySchema.optional(),
  note: z.string().max(1000).nullable().optional(),
});

const taskFields = {
  title: z.string().trim().min(1, "Give the task a title").max(160),
  notes: z.string().trim().max(1000).nullable(),
  date: dateKeySchema,
  time: timeOfDaySchema.nullable(),
  hue: hueSchema,
  categoryId: z.string().min(1).nullable(),
};

export const taskInputSchema = z.object({
  ...taskFields,
  notes: taskFields.notes.optional(),
  time: taskFields.time.optional(),
  categoryId: taskFields.categoryId.optional(),
  hue: hueSchema.default(330),
});

export const taskPatchSchema = z.object(taskFields).partial().extend({
  completed: z.boolean().optional(),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Give the category a name").max(60),
  hue: hueSchema.default(210),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  timezone: z.string().trim().min(1).max(80).optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  accentHue: hueSchema.optional(),
  defaultCalendarView: z.enum(["month", "week", "day", "list"]).optional(),
  notifications: z
    .object({
      inApp: z.boolean(),
      browser: z.boolean(),
      reminderLeadMinutes: z.number().int().min(0).max(180),
      quietFrom: timeOfDaySchema.nullable().optional(),
      quietUntil: timeOfDaySchema.nullable().optional(),
    })
    .optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Enter your password to confirm"),
});

export const timerStartSchema = z.object({
  occurrenceId: z.string().min(1),
});

export const timerActionSchema = z.object({
  action: z.enum(["pause", "resume", "stop", "complete"]),
});

export type HabitInput = z.infer<typeof habitInputSchema>;
export type HabitPatch = z.infer<typeof habitPatchSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type StepInput = z.infer<typeof stepInputSchema>;

/** Returns the first validation message as a sentence. */
export function firstErrorMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the details you entered.";
}
