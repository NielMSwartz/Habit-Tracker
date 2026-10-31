import { prisma } from "@/lib/db";
import { apiError, apiOk, unauthorized } from "@/lib/api";
import { getCurrentUser, listUserSessions } from "@/lib/auth";
import type { SessionDTO } from "@/lib/types";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  const sessions = await listUserSessions(current.user.id);
  const data: SessionDTO[] = sessions.map((session) => ({
    id: session.id,
    current: session.id === current.session.id,
    deviceLabel: session.deviceLabel,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
  }));
  return apiOk(data);
}

export async function DELETE() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();

  await prisma.session.deleteMany({
    where: { userId: current.user.id, id: { not: current.session.id } },
  });
  return apiOk({ signedOutOthers: true });
}

export async function PATCH() {
  return apiError("Use DELETE to sign out the other devices.", 405);
}
