import Link from "next/link";
import { redirect } from "next/navigation";
import { GITDM } from "@/lib/branding";
import { getAuthSession } from "@/lib/auth-session";
import { getCurrentUser, getRoleLandingPath } from "@/lib/access";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string; verified?: string; email?: string }> }) {
  const params = await searchParams;
  const session = await getAuthSession();
  const returnTo = params.returnTo?.startsWith("/") ? params.returnTo : "/campus";
  if (session?.user) {
    if (!session.user.emailVerified) {
      redirect(`/auth/verify-email?returnTo=${encodeURIComponent(returnTo)}`);
    }
    const currentUser = await getCurrentUser();
    const roleCodes = currentUser?.roles.map((item) => item.role.code) ?? [];
    redirect(getRoleLandingPath(roleCodes));
  }

  return (
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true" />
      <section className="auth-layout">
        <div className="auth-intro">
          <Link href="/" className="auth-logo">
            <img src="/gitdm-brand.jpeg" alt="GITDM" />
            <span><strong>{GITDM.shortName}</strong><small>{GITDM.tagline}</small></span>
          </Link>
          <div className="auth-intro-copy">
            <span className="auth-kicker">GITDM Secure Access</span>
            <h1>Your learning journey, in one place.</h1>
            <p>Sign in to access the GITDM workspace assigned to your institutional role — student, staff, parent/guardian or alumni.</p>
            <div className="auth-points">
              <span><i>✓</i> Secure account access</span>
              <span><i>✓</i> Applications and admission status</span>
              <span><i>✓</i> Learning, assessments and records</span>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel-head">
            <span className="auth-mobile-kicker">GITDM Secure Access</span>
            <h2>Welcome back</h2>
            <p>Sign in with the email and password linked to your GITDM account.</p>
          </div>
          {params.verified === "1" ? <div className="auth-success" role="status">Email verified successfully. Sign in with your password to enter Campus.</div> : null}
          {params.error ? <div className="auth-alert" role="alert">{params.error}</div> : null}
          <form action={signIn} className="auth-form">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" defaultValue={params.email || ""} required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Enter your password" required /></label>
            <div className="auth-form-row"><span>Use the account you created with GITDM.</span><Link href="/auth/signup">Create account</Link></div>
            <button className="auth-submit" type="submit">Sign in to GITDM <span>→</span></button>
          </form>
          <div className="auth-divider"><span>New to GITDM?</span></div>
          <Link className="auth-secondary-button" href={`/auth/signup?returnTo=${encodeURIComponent(returnTo)}`}>Create your GITDM account</Link>
          <Link href="/" className="auth-back">← Back to public website</Link>
        </div>
      </section>
    </main>
  );
}
