"use client";

import { Download } from "lucide-react";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { CategoryManager } from "@/components/settings/CategoryManager";
import { DangerZone } from "@/components/settings/DangerZone";
import { DataSettings } from "@/components/settings/DataSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { ScheduleSettings } from "@/components/settings/ScheduleSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { SessionManager } from "@/components/settings/SessionManager";
import { PageHeader } from "@/components/ui/PageHeader";

/** The settings screen: account, appearance, time, reminders, data and safety. */
export function SettingsView() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 sm:space-y-6">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Tune Chromatic to fit your rhythm. Everything here syncs to every signed-in device."
        actions={
          <a href="/api/export" download className="btn btn-outline btn-sm">
            <Download className="size-3.5" /> Export data
          </a>
        }
      />

      <ProfileSettings />

      <div className="grid gap-5 lg:grid-cols-2">
        <AppearanceSettings />
        <ScheduleSettings />
      </div>

      <NotificationSettings />

      <div className="grid gap-5 lg:grid-cols-2">
        <SecuritySettings />
        <DataSettings />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <CategoryManager />
        <SessionManager />
      </div>

      <DangerZone />
    </div>
  );
}
