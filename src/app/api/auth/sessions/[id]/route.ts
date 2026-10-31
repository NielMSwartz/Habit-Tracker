import { prisma } from "@/lib/db";
import { apiError, apiOk, unauthorized } from "@/lib/api";
import { destroyCurrentSession, getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { id } = await context.params;

  const session = await prisma.session.findFirst({
    where: { id, userId: current.user.id },
  });
  if (!session) return apiError("That device is no longer signed in.", 404);

  if (session.id === current.session.id) {
    await destroyCurrentSession();
    return apiOk({ signedOut: true, current: true });
  }

  await prisma.session.delete({ where: { id: session.id } });
  return apiOk({ signedOut: true, current: false });
}
