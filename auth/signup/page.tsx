import Link from "next/link";
import { redirect } from "next/navigation";
import { GITDM } from "@/lib/branding";
import { getAuthSession } from "@/lib/auth-session";
import { signUp } from "./actions";

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  const params = await searchParams;
  const session = await getAuthSession();
  const returnTo = params.returnTo?.startsWith("/") ? params.returnTo : "/campus";
  if (session?.user) {
    if (!session.user.emailVerified) {
      redirect(`/auth/verify-email?returnTo=${encodeURIComponent(returnTo)}`);
    }
    redirect(returnTo);
  }

  return (
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true" />
      <section className="auth-layout auth-layout-signup">
        <div className="auth-intro">
          <Link href="/" className="auth-logo">
            <img src="/gitdm-brand.jpeg" alt="GITDM" />
            <span><strong>{GITDM.shortName}</strong><small>{GITDM.tagline}</small></span>
          </Link>
          <div className="auth-intro-copy">
            <span className="auth-kicker">Join GITDM</span>
            <h1>One account for your entire GITDM journey.</h1>
            <p>Create your permanent GITDM identity before you apply. The same account follows you from application to admission, campus and alumni services.</p>
            <div className="auth-points">
              <span><i>1</i> Create your account</span>
              <span><i>2</i> Complete your application</span>
              <span><i>3</i> Follow your admission journey</span>
            </div>
          </div>
        </div>

        <div className="auth-panel auth-panel-signup">
          <div className="auth-panel-head">
            <span className="auth-mobile-kicker">GITDM Account</span>
            <h2>Create your account</h2>
            <p>It takes a minute. You will use this account for applications and Campus access.</p>
          </div>
          {params.error ? <div className="auth-alert" role="alert">{params.error}</div> : null}
          <form action={signUp} className="auth-form">
            <input type="hidden" name="returnTo" value={returnTo} />
            <div className="auth-name-grid">
              <label>First name<input name="firstName" autoComplete="given-name" placeholder="First name" required /></label>
              <label>Last name<input name="lastName" autoComplete="family-name" placeholder="Last name" required /></label>
            </div>
            <div className="auth-name-grid">
              <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+256 7xx xxx xxx" required /></label>
              <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            </div>
            <div className="auth-name-grid">
              <label>Password<input name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" minLength={8} required /></label>
              <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repeat password" minLength={8} required /></label>
            </div>
            <label className="auth-check"><input name="terms" type="checkbox" value="accepted" required /><span>I accept the GITDM terms and understand that my account information will be used to provide institutional services.</span></label>
            <button className="auth-submit" type="submit">Create GITDM account <span>→</span></button>
          </form>
          <p className="auth-login-line">Already have an account? <Link href={`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`}>Sign in</Link></p>
          <Link href="/" className="auth-back">← Back to public website</Link>
        </div>
      </section>
    </main>
  );
}
