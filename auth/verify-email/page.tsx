import { redirect } from "next/navigation";
import Link from "next/link";
import { GITDM } from "@/lib/branding";
import { getAuthSession } from "@/lib/auth-session";
import VerifyEmailForm from "./verify-email-form";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; email?: string }>;
}) {
  const params = await searchParams;
  const session = await getAuthSession();
  const returnTo = params.returnTo?.startsWith("/") && !params.returnTo.startsWith("//") ? params.returnTo : "/campus";
  const email = session?.user?.email || params.email?.trim().toLowerCase() || "";

  if (!email) {
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (session?.user?.emailVerified) {
    redirect(returnTo);
  }

  return (
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true" />
      <section className="auth-layout auth-layout-verify">
        <div className="auth-intro">
          <Link href="/" className="auth-logo">
            <img src="/gitdm-brand.jpeg" alt="GITDM" />
            <span><strong>{GITDM.shortName}</strong><small>{GITDM.tagline}</small></span>
          </Link>
          <div className="auth-intro-copy">
            <span className="auth-kicker">Secure your account</span>
            <h1>Confirm your email, then enter Campus.</h1>
            <p>We use a one-time verification code to confirm that you control the email address attached to your GITDM identity.</p>
            <div className="auth-points">
              <span><i>✓</i> Stops accounts using inaccessible emails</span>
              <span><i>✓</i> Protects your academic identity</span>
              <span><i>✓</i> Unlocks your GITDM account after confirmation</span>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-panel-verify">
          <div className="auth-panel-head">
            <span className="auth-mobile-kicker">Email verification</span>
            <h2>Enter your code</h2>
            <p>Enter the 6-digit code sent to <strong>{email}</strong>.</p>
          </div>
          {params.error ? <div className="auth-alert" role="alert">{params.error}</div> : null}
          <VerifyEmailForm email={email} returnTo={returnTo} />
          <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`} className="auth-back">← Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
