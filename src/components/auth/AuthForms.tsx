"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { apiFetch, ApiError, NetworkError } from "@/lib/client/api";
import { Spinner } from "@/components/ui/Spinner";
import {
  forgotPasswordSchema,
  loginSchema,
  MIN_PASSWORD_LENGTH,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";

function messageOf(cause: unknown): string {
  if (cause instanceof ApiError || cause instanceof NetworkError) return cause.message;
  if (cause instanceof Error) return cause.message;
  return "Something went wrong. Please try again.";
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="field-error">{children}</p>;
}

function Alert({ tone = "danger", children }: { tone?: "danger" | "success"; children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className={
        tone === "danger"
          ? "flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--danger)_32%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-xs font-medium leading-relaxed text-[var(--danger)]"
          : "flex items-start gap-2 rounded-xl border border-[color-mix(in_oklch,var(--success)_32%,transparent)] bg-[var(--success-soft)] px-3 py-2.5 text-xs font-medium leading-relaxed text-[var(--success)]"
      }
    >
      {tone === "danger" ? (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      )}
      <div>{children}</div>
    </div>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Your password",
  autoComplete = "current-password",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <input
        id={id}
        className="input pl-9 pr-11"
        type={visible ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-ink"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export function LoginForm({ notice }: { notice?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      window.location.assign("/dashboard");
    } catch (cause) {
      setError(messageOf(cause));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Welcome back</h1>
        <p className="mt-1.5 text-sm text-muted">
          Pick up your streak where you left it.
        </p>
      </div>

      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}

      <div>
        <label className="label" htmlFor="login-email">E-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            id="login-email"
            type="email"
            className="input pl-9"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <label className="label" htmlFor="login-password">Password</label>
          <Link href="/forgot-password" className="mb-1.5 text-[0.72rem] font-semibold text-accent hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="login-password" value={password} onChange={setPassword} />
      </div>

      <button type="submit" className="btn btn-brand w-full" disabled={busy}>
        {busy ? <Spinner size={16} /> : null}
        {busy ? "Signing in…" : "Sign in"}
        {!busy ? <ArrowRight className="size-4" /> : null}
      </button>

      <p className="text-center text-sm text-muted">
        New to Chromatic?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      window.location.assign("/dashboard");
    } catch (cause) {
      setError(messageOf(cause));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Start something colourful
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          Free, private, and yours on every device.
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div>
        <label className="label" htmlFor="register-name">Name</label>
        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            id="register-name"
            className="input pl-9"
            placeholder="Alex Rivera"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="register-email">E-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            id="register-email"
            type="email"
            className="input pl-9"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="register-password">Password</label>
        <PasswordInput
          id="register-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <p className="field-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>

      <div>
        <label className="label" htmlFor="register-confirm">Confirm password</label>
        <PasswordInput
          id="register-confirm"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Type it again"
        />
        <FieldError>{confirm && confirm !== password ? "Passwords do not match." : undefined}</FieldError>
      </div>

      <button type="submit" className="btn btn-brand w-full" disabled={busy}>
        {busy ? <Spinner size={16} /> : null}
        {busy ? "Creating your account…" : "Create account"}
        {!busy ? <ArrowRight className="size-4" /> : null}
      </button>

      <p className="text-center text-xs leading-relaxed text-faint">
        By continuing you agree that your habit data is stored securely and never
        shared. You can export or delete it at any time.
      </p>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ message: string; devUrl?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid e-mail.");
      return;
    }
    setBusy(true);
    try {
      const result = await apiFetch<{ message: string; devUrl?: string }>(
        "/api/auth/forgot-password",
        { method: "POST", body: JSON.stringify(parsed.data) },
      );
      setSent(result);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
          <Mail className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Check your inbox</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">{sent.message}</p>
        </div>
        {sent.devUrl ? (
          <div className="rounded-xl border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3.5 text-xs leading-relaxed text-soft">
            <p className="font-semibold text-ink">Development mode</p>
            <p className="mt-1">
              E-mail delivery is not configured, so here is your one-time reset link:
            </p>
            <a
              href={sent.devUrl}
              className="mt-2 inline-block break-all font-semibold text-accent underline"
            >
              {sent.devUrl}
            </a>
          </div>
        ) : null}
        <Link href="/login" className="btn btn-outline w-full">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Reset your password
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Enter the e-mail on your account and we will send a single-use link that
          expires in one hour.
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div>
        <label className="label" htmlFor="forgot-email">E-mail</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            id="forgot-email"
            type="email"
            className="input pl-9"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
      </div>

      <button type="submit" className="btn btn-brand w-full" disabled={busy}>
        {busy ? <Spinner size={16} /> : null}
        {busy ? "Sending…" : "Send reset link"}
      </button>

      <p className="text-center text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your new password.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(parsed.data),
      });
      setDone(true);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-4">
        <Alert>This reset link is incomplete. Request a fresh one to continue.</Alert>
        <Link href="/forgot-password" className="btn btn-primary w-full">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
          <CheckCircle2 className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Password updated</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Every other device has been signed out. Sign in with your new password.
          </p>
        </div>
        <Link href="/login" className="btn btn-brand w-full">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Choose a new password
        </h1>
        <p className="mt-1.5 text-sm text-muted">
          This link can only be used once.
        </p>
      </div>

      {error ? <Alert>{error}</Alert> : null}

      <div>
        <label className="label" htmlFor="reset-password">New password</label>
        <PasswordInput
          id="reset-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <p className="field-hint">At least {MIN_PASSWORD_LENGTH} characters.</p>
      </div>

      <div>
        <label className="label" htmlFor="reset-confirm">Confirm new password</label>
        <PasswordInput
          id="reset-confirm"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="Type it again"
        />
      </div>

      <button type="submit" className="btn btn-brand w-full" disabled={busy}>
        {busy ? <Spinner size={16} /> : null}
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
