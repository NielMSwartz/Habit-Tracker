"use client";

import type { OverviewDTO, UserDTO } from "@/lib/types";
import { AppProvider } from "@/components/providers/AppProvider";
import { AppShell } from "@/components/layout/AppShell";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ReminderPoller } from "@/components/pwa/ReminderPoller";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { ToastProvider } from "@/components/ui/Toast";

/** All client providers used by the signed-in application. */
export function AppProviders({
  user,
  overview,
  children,
}: {
  user: UserDTO;
  overview: OverviewDTO;
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <AppProvider initialUser={user} initialData={overview}>
        <ServiceWorkerRegistrar />
        <ReminderPoller />
        <InstallPrompt />
        <AppShell>{children}</AppShell>
      </AppProvider>
    </ToastProvider>
  );
}
