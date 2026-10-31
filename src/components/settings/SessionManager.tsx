"use client";

import { useCallback, useEffect, useState } from "react";
import { Laptop, LogOut, MonitorSmartphone, ShieldCheck, Smartphone } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SectionCard } from "@/components/ui/SectionCard";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch, ApiError, clearOfflineData } from "@/lib/client/api";
import type { SessionDTO } from "@/lib/types";
import { cn, relativeTime } from "@/lib/ui";

function DeviceIcon({ label }: { label: string | null }) {
  const value = (label ?? "").toLowerCase();
  if (value.includes("android") || value.includes("ios")) return <Smartphone className="size-4" />;
  if (value.includes("mac") || value.includes("windows") || value.includes("linux"))
    return <Laptop className="size-4" />;
  return <MonitorSmartphone className="size-4" />;
}

/** Lists every signed-in device and lets the person revoke them one by one. */
export function SessionManager() {
  const { refresh } = useApp();
  const [sessions, setSessions] = useState<SessionDTO[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSessions(await apiFetch<SessionDTO[]>("/api/auth/sessions"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not load devices.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (session: SessionDTO) => {
    setBusy(session.id);
    try {
      await apiFetch(`/api/auth/sessions/${session.id}`, { method: "DELETE" });
      if (session.current) {
        await clearOfflineData();
        window.location.assign("/login");
        return;
      }
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not revoke that device.");
    } finally {
      setBusy(null);
    }
  };

  const revokeOthers = async () => {
    setBusy("others");
    try {
      await apiFetch("/api/auth/sessions", { method: "DELETE" });
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not sign out other devices.");
    } finally {
      setBusy(null);
    }
  };

  const signOut = async () => {
    setBusy("signout");
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      await clearOfflineData();
      await refresh(true).catch(() => undefined);
      window.location.assign("/login");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SectionCard
      title="Devices & sessions"
      description="Each browser gets its own session. Revoke anything you do not recognise."
      eyebrow="Security"
      action={
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={revokeOthers}
          disabled={busy !== null || (sessions?.length ?? 0) < 2}
        >
          {busy === "others" ? <Spinner size={13} /> : <LogOut className="size-3.5" />}
          Sign out others
        </button>
      }
    >
      <div className="space-y-2">
        {error ? (
          <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-xs font-medium text-[var(--danger)]">
            {error}
          </p>
        ) : null}

        {sessions === null ? (
          <div className="flex justify-center py-4">
            <Spinner size={18} className="text-accent" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted">No active sessions.</p>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={cn(
                "flex items-start gap-2.5 rounded-xl border border-line bg-surface-2/60 p-2.5",
                session.current && "border-[var(--accent-line)] bg-[var(--accent-soft)]",
              )}
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-solid text-muted">
                <DeviceIcon label={session.deviceLabel} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink">
                  {session.deviceLabel ?? "Unknown device"}
                  {session.current ? (
                    <span className="chip !border-transparent !bg-[var(--success-soft)] !px-1.5 !py-0 !text-[0.55rem] !text-[var(--success)]">
                      This device
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[0.62rem] text-faint">
                  Active {relativeTime(session.lastSeenAt)}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm shrink-0 text-[var(--danger)]"
                onClick={() => void revoke(session)}
                disabled={busy !== null}
              >
                {busy === session.id ? <Spinner size={12} /> : null}
                {session.current ? "Sign out" : "Revoke"}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-surface-2/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-[0.7rem] text-muted">
          <ShieldCheck className="size-3.5 text-[var(--success)]" />
          Sessions expire after 30 days of inactivity.
        </p>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={signOut}
          disabled={busy !== null}
        >
          {busy === "signout" ? <Spinner size={13} /> : <LogOut className="size-3.5" />}
          Sign out of Chromatic
        </button>
      </div>
    </SectionCard>
  );
}
