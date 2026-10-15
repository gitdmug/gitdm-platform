import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth-session";
import { getCurrentUser } from "@/lib/access";
import { CampusShell, type CampusNavItem } from "@/components/CampusShell";

/** Session depends on request cookies — never statically cache this layout. */
export const dynamic = "force-dynamic";

const STUDENT_NAV: CampusNavItem[] = [
  { href: "/student", label: "Dashboard" },
  {
    href: "/student/learn",
    label: "Learning",
    children: [
      { href: "/student/learn", label: "Modules & lessons" },
      { href: "/student/classes", label: "Live classes" },
      { href: "/student/calendar", label: "Calendar" },
    ],
  },
  {
    href: "/student/assignments",
    label: "Assessments",
    children: [
      { href: "/student/assignments", label: "Assignments" },
      { href: "/student/quizzes", label: "Quizzes" },
      { href: "/student/exams", label: "Exams" },
    ],
  },
  { href: "/student/grades", label: "Grades" },
  { href: "/student/finance", label: "Finance" },
  { href: "/student/certificates", label: "Certificates" },
  { href: "/student/library", label: "Library" },
  { href: "/student/notifications", label: "Notifications" },
  { href: "/student/id-card", label: "Student ID" },
  { href: "/student/profile", label: "Profile" },
  { href: "/student/requests", label: "Requests" },
  { href: "/student/support", label: "Support" },
];

function hasAuthCookieHint(cookieStore: Awaited<ReturnType<typeof cookies>>): boolean {
  // Neon Auth sets __Secure-neon-auth.* cookies in production.
  // Presence means "browser believes it is signed in" even if getSession() glitched.
  const all = cookieStore.getAll();
  return all.some(
    (c) =>
      c.name.includes("neon-auth") ||
      c.name.includes("session_token") ||
      c.name.includes("session_data") ||
      c.name.includes("better-auth"),
  );
}

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  const cookieStore = await cookies();
  const cookieHint = hasAuthCookieHint(cookieStore);

  if (!session?.user) {
    // Only hard-redirect when there is clearly no session cookie.
    // If a neon-auth cookie exists but getSession failed (stale cache / upstream
    // blip), render a soft recovery instead of bouncing to sign-in (loop source).
    if (!cookieHint) {
      redirect("/auth/sign-in?returnTo=/student");
    }
    console.warn(
      "[GITDM student layout] getAuthSession returned null but auth cookies present — soft continue",
    );
  }

  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("[GITDM student layout] getCurrentUser failed:", error);
  }

  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email?.split("@")[0] ||
      "Student"
    : session?.user?.name ||
      session?.user?.email?.split("@")[0] ||
      "Student";

  return (
    <CampusShell
      title="Student portal"
      subtitle="Campus"
      items={STUDENT_NAV}
      userLabel={name}
    >
      {children}
    </CampusShell>
  );
}
