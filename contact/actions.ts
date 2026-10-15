"use server";

import { redirect } from "next/navigation";
import { GITDM } from "@/lib/branding";
import { brandedEmail, sendEmail } from "@/lib/mail";

function clean(value: FormDataEntryValue | null, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function submitEnquiry(formData: FormData) {
  const name = clean(formData.get("name"), 120);
  const email = clean(formData.get("email"), 254).toLowerCase();
  const subject = clean(formData.get("subject"), 180) || "General enquiry";
  const message = clean(formData.get("body"), 5000);

  if (!name || !email || !message) {
    redirect("/contact?status=missing");
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br/>");

  const topic = subject.toLowerCase();
  const department = /admission|application|enrol|enroll|entry requirement/.test(topic)
    ? { name: "Admissions", email: process.env.EMAIL_ADMISSIONS || GITDM.admissionsEmail, mailbox: "admissions" as const }
    : /finance|invoice|payment|refund|fee|receipt/.test(topic)
      ? { name: "Finance", email: process.env.EMAIL_FINANCE || process.env.EMAIL_SUPPORT || GITDM.supportEmail, mailbox: "support" as const }
      : /academic|class|lesson|exam|assessment|student|timetable|course|programme|program/.test(topic)
        ? { name: "Academic Department", email: process.env.EMAIL_ACADEMIC || process.env.EMAIL_SUPPORT || GITDM.supportEmail, mailbox: "support" as const }
        : /partner|partnership|broker|sponsor/.test(topic)
          ? { name: "Partnerships", email: process.env.EMAIL_PARTNERSHIPS || process.env.EMAIL_SUPPORT || GITDM.supportEmail, mailbox: "support" as const }
          : { name: "General Support", email: process.env.EMAIL_SUPPORT || GITDM.supportEmail, mailbox: "support" as const };

  const result = await sendEmail({
    mailbox: department.mailbox,
    to: department.email,
    subject: `[${GITDM.shortName} ${department.name}] ${subject}`,
    html: brandedEmail({
      title: "New website enquiry",
      bodyHtml: `
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Topic:</strong> ${safeSubject}</p>
        <div style="margin-top:20px;padding:16px;background:#f6f8f7;border-radius:8px;line-height:1.6">${safeMessage}</div>
      `,
    }),
    text: `New GITDM website enquiry\n\nName: ${name}\nEmail: ${email}\nTopic: ${subject}\n\n${message}`,
    event: "PUBLIC_ENQUIRY_RECEIVED",
  });

  if (!result.ok) {
    console.error(`[GITDM enquiry] failed to notify ${department.name}:`, result.error);
    redirect("/contact?status=error");
  }

  await sendEmail({
    to: email,
    subject: `${GITDM.shortName} — enquiry received`,
    html: brandedEmail({
      title: "We received your enquiry",
      bodyHtml: `<p>Dear ${safeName},</p><p>Thank you for contacting ${GITDM.name}. Your enquiry has been received by our institutional team.</p><p>Our ${department.name} team will review your message and respond through the contact details you provided.</p><p><strong>Topic:</strong> ${safeSubject}</p>`,
      ctaLabel: "Visit GITDM",
      ctaHref: GITDM.website,
    }),
    text: `Dear ${name},\n\nWe received your enquiry at ${GITDM.name}. Our team will review it and respond.\n\nTopic: ${subject}`,
    event: "PUBLIC_ENQUIRY_ACKNOWLEDGED",
  });

  redirect("/contact?status=sent");
}
