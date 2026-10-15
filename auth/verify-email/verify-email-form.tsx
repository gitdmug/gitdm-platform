"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

const COOLDOWN_SECONDS = 45;

type Props = { email: string; returnTo: string };

export default function VerifyEmailForm({ email, returnTo }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Neon Auth sends the verification code as part of its enabled email-verification
  // configuration. Do not automatically resend here; that would create duplicate codes.
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const otp = code.replace(/\D/g, "");
    setError("");
    setMessage("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit verification code from your email.");
      return;
    }

    setBusy(true);
    try {
      const client = authClient as any;
      const result = await client.emailOtp.verifyEmail({ email, otp });
      if (result?.error) throw new Error(result.error.message || "That code is not valid.");

      // Email verification and authentication are separate operations in Neon
      // Auth. If the user arrived here from a blocked password login, the
      // verification call may not create a session. Send them back to sign-in
      // instead of looping through /campus and losing the verified state.
      const sessionResult = await client.getSession();
      const hasSession = Boolean(sessionResult?.data?.user);
      if (hasSession) {
        router.replace(returnTo);
      } else {
        router.replace(`/auth/sign-in?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}&verified=1`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not verify that code. Please try again.");
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || resending) return;
    setError("");
    setMessage("");
    setResending(true);
    try {
      const client = authClient as any;
      const result = await client.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (result?.error) throw new Error(result.error.message || "We could not send a new code.");
      setCooldown(COOLDOWN_SECONDS);
      setMessage("A new 6-digit verification code has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not send a new code.");
    } finally {
      setResending(false);
    }
  }

  return (
    <form className="auth-form verify-form" onSubmit={submit}>
      <label>
        Verification code
        <input
          className="verify-code-input"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          autoFocus
          aria-label="6-digit email verification code"
        />
      </label>
      {error ? <div className="auth-alert" role="alert">{error}</div> : null}
      {message ? <div className="auth-success" role="status">{message}</div> : null}
      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? "Verifying…" : "Verify email"} <span>→</span>
      </button>
      <div className="verify-resend-row">
        <span>Didn’t receive the code?</span>
        <button type="button" onClick={resend} disabled={cooldown > 0 || resending}>
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
      <p className="verify-note">Check your spam or promotions folder if the message is not in your inbox.</p>
    </form>
  );
}
