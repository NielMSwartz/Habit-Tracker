import { prisma } from "@/lib/db";
import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  unauthorized,
} from "@/lib/api";
import {
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { isValidTimezone } from "@/lib/dates";
import { toNotificationDTO, toUserDTO } from "@/lib/serialize";
import { firstErrorMessage, settingsSchema } from "@/lib/validation";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: current.user.id },
    include: { notification: true },
  });
  return apiOk({
    user: toUserDTO(user),
    notifications: user.notification
      ? toNotificationDTO(user.notification)
      : null,
  });
}

export async function PATCH(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const parsed = settingsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);
  const input = parsed.data;
  const user = current.user;

  if (input.timezone && !isValidTimezone(input.timezone)) {
    return apiError("That timezone is not recognised.", 422);
  }

  if (input.email && input.email !== user.email) {
    if (!input.currentPassword) {
      return apiError("Enter your current password to change your e-mail.", 422);
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return apiError("Your current password is incorrect.", 401);
    }
    const taken = await prisma.user.findUnique({ where: { email: input.email } });
    if (taken) return apiError("An account with that e-mail already exists.", 409);
  }

  let passwordHash: string | undefined;
  if (input.newPassword) {
    if (!input.currentPassword) {
      return apiError("Enter your current password to set a new one.", 422);
    }
    if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return apiError("Your current password is incorrect.", 401);
    }
    passwordHash = await hashPassword(input.newPassword);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.weekStartsOn !== undefined
        ? { weekStartsOn: input.weekStartsOn }
        : {}),
      ...(input.theme !== undefined ? { theme: input.theme } : {}),
      ...(input.accentHue !== undefined ? { accentHue: input.accentHue } : {}),
      ...(input.defaultCalendarView !== undefined
        ? { defaultCalendarView: input.defaultCalendarView }
        : {}),
      ...(passwordHash ? { passwordHash } : {}),
    },
    include: { notification: true },
  });

  let notification = updated.notification;
  if (input.notifications) {
    notification = await prisma.notificationSetting.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        inApp: input.notifications.inApp,
        browser: input.notifications.browser,
        reminderLeadMinutes: input.notifications.reminderLeadMinutes,
        quietFrom: input.notifications.quietFrom ?? null,
        quietUntil: input.notifications.quietUntil ?? null,
      },
      update: {
        inApp: input.notifications.inApp,
        browser: input.notifications.browser,
        reminderLeadMinutes: input.notifications.reminderLeadMinutes,
        quietFrom: input.notifications.quietFrom ?? null,
        quietUntil: input.notifications.quietUntil ?? null,
      },
    });
  }

  // Changing the password signs out every other device, but keeps this one.
  if (passwordHash) {
    await prisma.session.deleteMany({
      where: { userId: user.id, id: { not: current.session.id } },
    });
  }

  return apiOk({
    user: toUserDTO(updated),
    notifications: notification
      ? toNotificationDTO(notification)
      : {
          inApp: true,
          browser: false,
          reminderLeadMinutes: 0,
          quietFrom: null,
          quietUntil: null,
        },
  });
}
