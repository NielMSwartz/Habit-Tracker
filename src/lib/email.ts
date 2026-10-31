/**
 * Transactional e-mail.
 *
 * Password reset works out of the box in development: the reset link is logged
 * to the server and, in development only, returned to the browser so the flow
 * can be tested without an e-mail provider. In production set `RESEND_API_KEY`
 * (and optionally `EMAIL_FROM`) to deliver real messages through Resend.
 */

interface ResetEmailInput {
  to: string;
  name: string;
  resetUrl: string;
}

export interface EmailResult {
  delivered: boolean;
  /** Only present when no provider is configured and not in production. */
  fallbackUrl?: string;
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Sends a password-reset e-mail, or logs the link when no provider is set. */
export async function sendPasswordResetEmail(
  input: ResetEmailInput,
): Promise<EmailResult> {
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;padding:32px;color:#16121f">
      <div style="height:6px;border-radius:999px;background:linear-gradient(90deg,#3b82f6,#8b5cf6,#ec4899,#14b8a6)"></div>
      <h1 style="font-size:24px;margin:28px 0 8px">Reset your Chromatic password</h1>
      <p style="color:#5b5568;line-height:1.6">Hi ${escapeHtml(input.name)}, we received a request to reset your password. This link expires in one hour and can only be used once.</p>
      <p style="margin:28px 0">
        <a href="${input.resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:14px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600">Choose a new password</a>
      </p>
      <p style="color:#5b5568;font-size:13px;line-height:1.6">If you did not ask for this, you can safely ignore the e-mail. Your password will not change.</p>
    </div>`;

  if (!emailConfigured()) {
    console.info(`[Chromatic] Password reset link for ${input.to}: ${input.resetUrl}`);
    return {
      delivered: false,
      fallbackUrl: process.env.NODE_ENV === "production" ? undefined : input.resetUrl,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Chromatic <onboarding@resend.dev>",
      to: [input.to],
      subject: "Reset your Chromatic password",
      html,
    }),
  });

  if (!response.ok) {
    console.error("[Chromatic] Reset e-mail failed", await response.text());
    return { delivered: false };
  }
  return { delivered: true };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
