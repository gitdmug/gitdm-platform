import Link from "next/link";
import { GITDM } from "@/lib/branding";
import { getAuthSession } from "@/lib/auth-session";
import { getDb } from "@/lib/db";

type HeaderProps = {
  active?: string;
  workspace?: "student" | "staff";
};

const links = [
  { href: "/about", label: "About" },
  { href: "/programmes", label: "Programmes" },
  { href: "/admissions", label: "Admissions" },
  { href: "/trading-floor", label: "Trading Floor" },
  { href: "/partners", label: "Partners" },
  { href: "/research", label: "Research" },
  { href: "/announcements", label: "Notices" },
  { href: "/contact", label: "Contact" },
  { href: "/store", label: "Store" },
];

export async function Header({ active, workspace }: HeaderProps) {
  let userEmail: string | null = null;
  let userAvatar: string | null = null;
  let hasMemberAccess = false;
  let hasPrincipalRole = false;
  try {
    const session = await getAuthSession();
    userEmail = session?.user?.email ?? null;
    if (session?.user?.sub) {
      const db = getDb();
      if (db) {
        const current = await db.user.findUnique({
          where: { authUserId: session.user.sub },
          select: { profile: { select: { avatarUrl: true } }, roles: { select: { role: { select: { code: true } } } }, enrollments: { select: { status: true, accessLevel: true } } },
        });
        userAvatar = current?.profile?.avatarUrl ?? null;
        hasMemberAccess = Boolean(current?.enrollments?.some((e) => ["ACTIVE", "REPEATING"].includes(e.status) && e.accessLevel === "FULL"));
        hasPrincipalRole = Boolean(current?.roles?.some((r) => r.role.code === "PRINCIPAL"));
        if (userAvatar?.startsWith("neonfile:")) userAvatar = "/api/campus/files/profile";
      }
    }
  } catch {
    // Auth misconfigured or edge — show signed-out UI
  }

  if (workspace) {
    return (
      <header className="workspace-topbar">
        <input id="workspace-nav-toggle" className="workspace-nav-toggle" type="checkbox" aria-label="Toggle navigation" />
        <label htmlFor="workspace-nav-toggle" className="workspace-menu-button" aria-label="Open navigation menu">
          <span></span><span></span><span></span>
        </label>
        <Link href={workspace === "staff" ? (hasPrincipalRole ? "/staff/principal" : "/staff") : "/student"} className="workspace-brand"><img src="/gitdm-brand.jpeg" alt="GITDM"/><strong>GITDM</strong></Link>
        <div className="workspace-title">{workspace === "staff" ? "Staff Workspace" : "Member Dashboard"}</div>
        <form className="workspace-search" action="/search" method="get"><span>⌕</span><input name="q" aria-label="Search programmes and courses" placeholder="What would you like to learn?"/><button type="submit" aria-label="Search">Search</button></form>
        <div className="workspace-actions">{workspace === "staff" && hasMemberAccess ? <Link href="/student" className="btn btn-outline-dark btn-sm">Student Portal</Link> : null}<Link href={workspace === "staff" ? "/staff/student-affairs" : "/student/support"} aria-label="Help" className="workspace-help">?</Link><Link href={workspace === "staff" ? "/student/profile" : "/student/profile"} className="workspace-account">{userAvatar ? <img src={userAvatar} alt="" className="workspace-avatar" /> : <span className="workspace-avatar workspace-avatar-fallback">{(userEmail?.[0] || "G").toUpperCase()}</span>}<span>My Account⌄</span></Link>{userEmail?<a href="/auth/logout" className="workspace-signout">Sign out</a>:null}</div>
      </header>
    );
  }
  return (
    <>
      <div className="topbar">
        <div className="container topbar-inner">
          <span>
            {GITDM.location} · {GITDM.supportEmail}
          </span>
          <span className="topbar-right">
            <a
              href={`https://wa.me/256${GITDM.whatsapp.replace(/^0/, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp {GITDM.whatsapp}
            </a>
          </span>
        </div>
      </div>
      <header className="nav">
        <div className="container nav-inner">
          <Link href="/" className="brand">
            <img src="/gitdm-brand.jpeg" alt="GITDM" className="brand-mark" />
            <span>
              <strong>GITDM</strong>
              <small>{GITDM.tagline}</small>
            </span>
          </Link>
          <input id="public-nav-toggle" className="public-nav-toggle" type="checkbox" aria-label="Toggle navigation" />
          <label htmlFor="public-nav-toggle" className="public-menu-button" aria-label="Open navigation menu">
            <span></span><span></span><span></span>
          </label>
          <nav className="nav-links" aria-label="Primary">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={active === link.href ? "active" : undefined}
              >
                {link.label}
              </Link>
            ))}
            {userEmail ? (
              <>
                <Link href="/student" className="btn btn-outline-dark btn-sm">
                  Campus
                </Link>
                <a href="/auth/logout" className="btn btn-primary btn-sm">
                  Sign out
                </a>
              </>
            ) : (
              <>
                <a href="/auth/sign-in" className="btn btn-outline-dark btn-sm">
                  Campus
                </a>
                <a href="/auth/signup" className="btn btn-primary btn-sm">
                  Create account
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
