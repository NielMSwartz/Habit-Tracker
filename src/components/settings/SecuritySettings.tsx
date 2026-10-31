"use client";

import { useState } from "react";
import { Check, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SectionCard } from "@/components/ui/SectionCard";
import { Spinner } from "@/components/ui/Spinner";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";

/** Changes the password with a confirmation field and honest guard rails. */
export function SecuritySettings() {
  const { saveSettings } = useApp();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for the new password.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a new password that differs from the current one.");
      return;
    }

    setSaving(true);
    const ok = await saveSettings({ currentPassword, newPassword });
    setSaving(false);
    if (ok) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <SectionCard
      title="Password"
      description="Changing it signs out every other device but keeps this one connected."
      eyebrow="Security"
    >
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="label" htmlFor="password-current">
            Current password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input
              id="password-current"
              type="password"
              className="input pl-9"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password-new">
              New password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                id="password-new"
                type="password"
                className="input pl-9"
                value={newPassword}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="password-confirm">
              Confirm new password
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                id="password-confirm"
                type="password"
                className="input pl-9"
                value={confirmPassword}
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
        </div>

        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : (
          <p className="field-hint flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-[var(--success)]" />
            At least {MIN_PASSWORD_LENGTH} characters. Stored as a bcrypt hash, never in plain text.
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner size={15} /> : <Check className="size-4" />}
            Update password
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
