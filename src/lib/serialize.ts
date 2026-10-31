import type { Category, Task, User } from "@prisma/client";
import type {
  CategoryDTO,
  NotificationSettingsDTO,
  TaskDTO,
  UserDTO,
} from "./types";

/** Converts a user row to the browser-safe shape. */
export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    weekStartsOn: user.weekStartsOn,
    theme: user.theme as UserDTO["theme"],
    accentHue: user.accentHue,
    defaultCalendarView: user.defaultCalendarView as UserDTO["defaultCalendarView"],
    createdAt: user.createdAt.toISOString(),
  };
}

export function toCategoryDTO(category: Category): CategoryDTO {
  return { id: category.id, name: category.name, hue: category.hue };
}

export function toTaskDTO(
  task: Task & { category?: { name: string } | null },
): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    date: task.date,
    time: task.time,
    hue: task.hue,
    categoryId: task.categoryId,
    categoryName: task.category?.name ?? null,
    completed: task.completed,
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

export function toNotificationDTO(settings: {
  inApp: boolean;
  browser: boolean;
  reminderLeadMinutes: number;
  quietFrom: string | null;
  quietUntil: string | null;
}): NotificationSettingsDTO {
  return {
    inApp: settings.inApp,
    browser: settings.browser,
    reminderLeadMinutes: settings.reminderLeadMinutes,
    quietFrom: settings.quietFrom,
    quietUntil: settings.quietUntil,
  };
}
