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

export async function GET() {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  const categories = await prisma.category.findMany({
    where: { userId: auth.user.id },
    orderBy: { name: "asc" },
  });
  return apiOk(categories.map(toCategoryDTO));
}

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  const auth = await requireApiUser();
  if (!auth) return unauthorized();

  const parsed = categoryInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiError(firstErrorMessage(parsed.error), 422);

  try {
    const category = await prisma.category.create({
      data: { userId: auth.user.id, name: parsed.data.name, hue: parsed.data.hue },
    });
    return apiOk(toCategoryDTO(category), 201);
  } catch {
    return apiError("A category with that name already exists.", 409);
  }
}
