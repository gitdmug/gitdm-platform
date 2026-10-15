/**
 * Dual-channel notifications: in-app + optional email (Resend).
 * Email failures never block the primary workflow.
 */

import { getDb } from "@/lib/db";
import { sendEmail, brandedEmail } from "@/lib/mail";

export async function notifyUser(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  email?: boolean;
}) {
  const db = getDb();
  if (!db) return;

  await db.notification.create({
    data: {
      userId: params.userId,
      type: params.type as any,
      title: params.title,
      body: params.body,
    },
  });

  if (params.email !== false) {
    try {
      const user = await db.user.findUnique({
        where: { id: params.userId },
        select: { email: true, firstName: true },
      });
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: params.title,
          html: brandedEmail({
            title: params.title,
            bodyHtml: `<p>Dear ${user.firstName || "Student"},</p><p>${params.body}</p>`,
          }),
          text: params.body,
          userId: params.userId,
          event: params.type,
        });
      }
    } catch (err) {
      console.warn("[notify] email skipped:", err);
    }
  }
}

export function generateStudentNumber(programmeCode: string) {
  const y = new Date().getFullYear().toString().slice(-2);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = programmeCode.replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase() || "GITDM";
  return `${code}/${y}/${rand}`;
}
