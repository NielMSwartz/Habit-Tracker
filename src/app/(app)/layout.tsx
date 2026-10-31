import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import { requireUser } from "@/lib/auth";
import { loadOverview } from "@/lib/overview";
import { toUserDTO } from "@/lib/serialize";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s · Chromatic",
  },
};

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/login");
  const overview = await loadOverview(user.id, user.timezone);

  return (
    <AppProviders user={toUserDTO(user)} overview={overview}>
      {children}
    </AppProviders>
  );
}
