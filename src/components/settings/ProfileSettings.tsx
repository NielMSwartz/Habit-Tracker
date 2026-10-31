"use client";

import { useState } from "react";
import { AtSign, Check, LockKeyhole, UserRound } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { SectionCard } from "@/components/ui/SectionCard";
import { Spinner } from "@/components/ui/Spinner";
import { initials } from "@/lib/ui";

/** Name, e-mail and the current password needed to change the address. */
export function ProfileSettings() {
  const { user, saveSettings } = useApp();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emailChanged = email.trim().toLowerCase() !== user.email.toLowerCase();
  const nameChanged = name.trim() !== user.name;
  const dirty = emailChanged || nameChanged;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (emailChanged && !currentPassword) {
      setError("Enter your current password to change your e-mail.");
      return;
    }

    setSaving(true);
    const ok = await saveSettings({
      name: name.trim(),
      ...(emailChanged
        ? { email: email.trim().toLowerCase(), currentPassword }
        : {}),
    });
    setSaving(false);

    if (ok) {
      setCurrentPassword("");
      setEmail(email.trim().toLowerCase());
    }
  };

  return (
    <SectionCard
      title="Profile"
      description="Your name and sign-in address. Habit data stays private to this account."
      eyebrow="Account"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white shadow-[var(--shadow-accent)]"
            style={{ background: "var(--brand-gradient)" }}
            aria-hidden="true"
          >
            {initials(user.name) || <UserRound className="size-6" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-0.5 text-[0.65rem] text-faint">
              Member since{" "}
              {new Date(user.createdAt).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="profile-name">
              Name
            </label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                id="profile-name"
                className="input pl-9"
                value={name}
                autoComplete="name"
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="profile-email">
              E-mail
            </label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                id="profile-email"
                type="email"
                className="input pl-9"
                value={email}
                autoComplete="email"
                maxLength={254}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
        </div>

        {emailChanged ? (
          <div>
            <label className="label" htmlFor="profile-current-password">
              Current password
            </label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                id="profile-current-password"
                type="password"
                className="input pl-9"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Required to change your e-mail"
              />
            </div>
            <p className="field-hint">
              We confirm your password before moving the account to a new
              address.
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || !dirty}
          >
            {saving ? <Spinner size={15} /> : <Check className="size-4" />}
            Save profile
          </button>
        </div>
      </form>
    </SectionCard>
  );
}
