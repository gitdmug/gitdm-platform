"use server";

import { auth } from "@/lib/auth/server";
import { getAuthSession } from "@/lib/auth-session";
import { syncGITDMUser } from "@/lib/identity";
import { getDb } from "@/lib/db";
import { redirect } from "next/navigation";
import { notifyStudentChange } from "@/lib/student-email";

function fail(returnTo: string, message: string): never {
  redirect(`/auth/signup?returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(message)}`);
}

export async function signUp(formData: FormData) {
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const acceptedTerms = formData.get("terms") === "accepted";
  const returnTo = String(formData.get("returnTo") || "/campus");

  if (!firstName || !lastName || !phone || !email || !password) fail(returnTo, "Please complete every required field.");
  if (password.length < 8) fail(returnTo, "Your password must contain at least 8 characters.");
  if (password !== confirmPassword) fail(returnTo, "The passwords do not match.");
  if (!acceptedTerms) fail(returnTo, "You must accept the GITDM terms and conditions.");

  const result = await auth.signUp.email({
    email,
    password,
    name: `${firstName} ${lastName}`.trim(),
  });
  if (result.error) fail(returnTo, result.error.message || "Account creation failed.");

  // Request the OTP immediately. Neon Auth may create an authenticated
  // session on signup or may wait for email verification first; both paths
  // must land on the same verification screen.
  try {
    const emailOtp = (auth as any).emailOtp;
    await emailOtp.sendVerificationOtp({ email, type: "email-verification" });
  } catch (otpError) {
    console.error("[GITDM auth] signup verification OTP send failed:", otpError);
  }

  const session = await getAuthSession();
  if (!session?.user) {
    redirect(`/auth/verify-email?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/campus")}&from=signup`);
  }

  const normalized = {
    ...session,
    user: {
      ...session.user,
      given_name: firstName,
      family_name: lastName,
    },
  };
  const user = await syncGITDMUser(normalized);
  const db = getDb();
  if (db && user) {
    await db.user.update({ where: { id: user.id }, data: { firstName, lastName, phone, termsAcceptedAt: new Date() } });
    await db.profile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await db.auditLog.create({ data: { userId: user.id, action: "ACCOUNT_CREATED", entity: "User", entityId: user.id } });
    await notifyStudentChange({ email, firstName, title: "Your GITDM account has been created", body: "Your GITDM account is ready. Please verify your email address using the verification code we sent you. After verification, you can continue to your application and Campus services.", action: "ACCOUNT_CREATED", href: `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/verify-email?email=${encodeURIComponent(email)}` });
  }

  // Keep the user on the dedicated six-digit verification screen until the
  // email is confirmed. The exact email is carried so the code field is never
  // hidden behind another sign-in step.
  redirect(`/auth/verify-email?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/campus")}&from=signup`);
}
