"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SectionCard } from "@/components/ui/SectionCard";

/** Irreversible account deletion, gated by the password and a confirmation. */
export function DangerZone() {
  const { user, deleteAccount } = useApp();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  return (
    <SectionCard
      title="Delete account"
      description="Permanently remove your profile and every habit, occurrence, timer, task and category."
      eyebrow="Danger zone"
      className="border-[color-mix(in_oklch,var(--danger)_35%,transparent)]"
    >
      <div className="flex items-start gap-3 rounded-xl bg-[var(--danger-soft)] p-3">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--danger)]" />
        <p className="text-xs leading-relaxed text-[var(--danger)]">
          This cannot be undone and there is no recovery window. Export your data
          first if you might want it later.
        </p>
      </div>

      <div className="mt-3">
        <label className="label" htmlFor="delete-password">
          Confirm with your password
        </label>
        <input
          id="delete-password"
          type="password"
          className="input"
          value={password}
          autoComplete="current-password"
          placeholder={`Password for ${user.email}`}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="field-hint">
          We verify your password on the server before deleting anything.
        </p>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setConfirming(true)}
          disabled={!password}
        >
          <Trash2 className="size-4" /> Delete my account
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Delete your Chromatic account?"
        message="Every habit, completion, timer, task and category will be permanently removed. This action cannot be reversed."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          const ok = await deleteAccount(password);
          if (ok) setPassword("");
        }}
      />
    </SectionCard>
  );
}
