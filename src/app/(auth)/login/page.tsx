import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const notice = params.expired
    ? "Your session expired. Please sign in again to keep syncing."
    : params.reset
      ? "Your password was updated. Sign in with the new one."
      : undefined;

  return <LoginForm notice={notice} />;
}
