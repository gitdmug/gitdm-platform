import { GITDM } from "@/lib/branding";
import { getDb } from "@/lib/db";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  userId?: string;
  event?: string;
  mailbox?: "support" | "admissions" | "principal";
};

/**
 * Email is intentionally kept outside the core application stack.
 * GITDM records all important events in the in-app notification/audit system;
 * operational email dispatch can be handled manually until an institutional
 * mailbox provider is selected.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const { to, subject, html, text, userId, event } = input;
  const recipients = (Array.isArray(to) ? to : [to]).map((e) => e.trim()).filter(Boolean);
  if (!recipients.length) return { ok: false, error: "No recipients" };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const mailbox = input.mailbox || "support";
  const from = (mailbox === "admissions" ? process.env.EMAIL_ADMISSIONS : mailbox === "principal" ? process.env.EMAIL_PRINCIPAL : process.env.EMAIL_SUPPORT)?.trim() || process.env.EMAIL_FROM?.trim() || "support@globalinstituteoftrading.com";
  const fromName = process.env.EMAIL_FROM_NAME?.trim() || GITDM.name;
  const db = userId ? getDb() : null;

  const record = async (status: string, error?: string, providerId?: string) => {
    if (!db) return;
    try {
      await db.emailDelivery.createMany({
        data: recipients.map((recipient) => ({ recipient, subject, event: event || null, status, provider: "RESEND", providerId: providerId || null, error: error || null, userId: userId || null })),
      });
    } catch (logError) {
      console.error("[GITDM email] delivery log failed:", logError);
    }
  };

  if (!apiKey) {
    const error = "Email service is not configured. Set RESEND_API_KEY in the deployment environment.";
    console.error("[GITDM email]", error);
    await record("NOT_CONFIGURED", error);
    return { ok: false, error };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${fromName} <${from}>`, to: recipients, subject, html, ...(text ? { text } : {}) }),
      cache: "no-store",
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const error = `Resend error ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`;
      console.error("[GITDM email]", error);
      await record("FAILED", error);
      return { ok: false, error };
    }
    const payload = await response.json().catch(() => ({})) as { id?: string };
    await record("SENT", undefined, payload.id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email request failed";
    console.error("[GITDM email] Resend request failed:", error);
    await record("FAILED", message);
    return { ok: false, error: message };
  }
}

export function brandedEmail(opts: {
  title: string;
  preheader?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  const cta = opts.ctaLabel && opts.ctaHref
    ? `<p style="margin:28px 0 8px"><a href="${opts.ctaHref}" style="display:inline-block;background:#0b3d2e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:600">${opts.ctaLabel}</a></p>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${opts.title}</title></head><body style="margin:0;padding:0;background:#f4f6f5;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a"><div style="display:none;max-height:0;overflow:hidden">${opts.preheader || opts.title}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e6"><tr><td style="background:#0b3d2e;padding:22px 28px"><div style="color:#c9a84c;font-size:12px;letter-spacing:0.12em;text-transform:uppercase">${GITDM.shortName}</div><div style="color:#ffffff;font-size:20px;font-weight:700;margin-top:4px">${GITDM.name}</div></td></tr><tr><td style="padding:28px"><h1 style="margin:0 0 16px;font-size:22px;color:#0b3d2e">${opts.title}</h1>${opts.bodyHtml}${cta}<hr style="border:none;border-top:1px solid #e8eeeb;margin:28px 0"/><p style="margin:0;font-size:13px;color:#5a6b64;line-height:1.5">${GITDM.name} · ${GITDM.location}<br/>Admissions: <a href="mailto:${GITDM.admissionsEmail}" style="color:#0b3d2e">${GITDM.admissionsEmail}</a><br/><a href="${GITDM.website}" style="color:#0b3d2e">${GITDM.website}</a></p></td></tr></table></td></tr></table></body></html>`;
}

export async function notifyAdmissionsTeam(subject: string, bodyHtml: string) {
  return sendEmail({
    to: GITDM.admissionsEmail,
    subject: `[${GITDM.shortName} Admissions] ${subject}`,
    html: brandedEmail({ title: subject, bodyHtml }),
    mailbox: "admissions",
  });
}
