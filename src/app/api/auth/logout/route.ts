import { apiOk, crossOrigin, forbidCrossOrigin } from "@/lib/api";
import { destroyCurrentSession } from "@/lib/auth";

export async function POST(request: Request) {
  if (crossOrigin(request)) return forbidCrossOrigin();
  await destroyCurrentSession();
  return apiOk({ signedOut: true });
}
