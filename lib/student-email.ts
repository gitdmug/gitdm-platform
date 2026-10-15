import { brandedEmail, sendEmail } from "@/lib/mail";

export async function notifyStudentChange(input: {
  email: string;
  firstName?: string | null;
  title: string;
  body: string;
  action?: string;
  href?: string;
  userId?: string;
  event?: string;
}) {
  const greeting = input.firstName ? `Dear ${input.firstName},` : "Dear GITDM student,";
  const auditLine = input.action ? `<p style="font-size:12px;color:#6b7280">Reference action: ${input.action}</p>` : "";
  return sendEmail({
    to: input.email,
    subject: `${input.title} | GITDM`,
    userId: input.userId,
    event: input.event || input.action,
    html: brandedEmail({
      title: input.title,
      preheader: input.title,
      bodyHtml: `<p>${greeting}</p><p>${input.body}</p>${auditLine}`,
      ctaLabel: input.href ? "Open GITDM Campus" : undefined,
      ctaHref: input.href,
    }),
  });
}
