"use server";

import { auth } from "@/lib/auth/server";
import { getCurrentUser, getRoleLandingPath } from "@/lib/access";
import { redirect } from "next/navigation";

function safeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/campus";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") || "/campus"));

  if (!email || !password) {
    redirect(`/auth/sign-in?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent("Email and password are required.")}`);
  }

  const result = await auth.signIn.email({ email, password });
  if (result.error) {
    const errorCode = String((result.error as { code?: string }).code || "");
    const message = result.error.message || "Sign in failed.";
    const verificationRequired = /email[_ -]?not[_ -]?verified|email[_ -]?verification|verification required|verify (your|the) email|email verification required/i.test(`${errorCode} ${message}`);

    // Neon Auth versions can surface the same state with different error codes.
    // Treat the semantic message as authoritative as well, so an unverified
    // account can never get stranded on the password form.
    if (verificationRequired) {
      try {
        const emailOtp = (auth as any).emailOtp;
        await emailOtp.sendVerificationOtp({ email, type: "email-verification" });
      } catch (otpError) {
        console.error("[GITDM auth] verification OTP send failed:", otpError);
      }
      redirect(`/auth/verify-email?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}&from=signin`);
    }

    redirect(`/auth/sign-in?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}&error=${encodeURIComponent(message)}`);
  }

  const session = await (await import("@/lib/auth-session")).getAuthSession();
  if (session?.user && !session.user.emailVerified) {
    redirect(`/auth/verify-email?email=${encodeURIComponent(session.user.email)}&returnTo=${encodeURIComponent(returnTo)}`);
  }

  // Resolve the institutional roles immediately after authentication. The
  // previous implementation blindly honoured the default /campus returnTo,
  // which meant staff accounts opened the student workspace.
  const currentUser = await getCurrentUser();
  const roleCodes = currentUser?.roles.map((item) => item.role.code) ?? [];
  const isDefaultStudentReturn = returnTo === "/campus" || returnTo === "/";
  const landing = getRoleLandingPath(roleCodes);

  // A staff/special account gets its role workspace even when the login form
  // supplied the normal student default. Students retain the requested path.
  if (roleCodes.length && (isDefaultStudentReturn || landing !== "/campus")) {
    redirect(landing);
  }

  redirect(returnTo);
}
