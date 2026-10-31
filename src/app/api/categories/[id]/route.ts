import {
  apiError,
  apiOk,
  crossOrigin,
  forbidCrossOrigin,
  requireApiUser,
  unauthorized,
} from "@/lib/api";
import { prisma } from "@/lib/db";
import { toCategoryDTO } from "@/lib/serialize";
import { categoryInputSchema, firstErrorMessage } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const parsed = categoryInputSchema.partial().safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const updated = await prisma.category.updateMany({
      where: { id, userId: auth.user.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.hue !== undefined ? { hue: parsed.data.hue } : {}),
      },
    });
    if (updated.count === 0) return apiError("That category was not found.", 404);
    const category = await prisma.category.findUniqueOrThrow({ where: { id } });
    return apiOk(toCategoryDTO(category));
  } catch {
    return apiError("A category with that name already exists.", 409);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const { id } = await context.params;

  const result = await prisma.category.deleteMany({
    where: { id, userId: auth.user.id },
  });
  if (result.count === 0) return apiError("That category was not found.", 404);
  return apiOk({ deleted: true });
}
