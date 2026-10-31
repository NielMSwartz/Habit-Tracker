import { apiOk, unauthorized } from "@/lib/api";
import { requireApiUser } from "@/lib/api";
import { loadOverview } from "@/lib/overview";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth) return unauthorized();
  return apiOk(await loadOverview(auth.user.id, auth.user.timezone));
}
