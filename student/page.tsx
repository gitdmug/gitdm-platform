import Link from "next/link";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { enrollmentStatusLabel, money } from "@/lib/status";
import { computeClearance, clearanceStatusLabel } from "@/lib/finance-clearance";
import { safeUserEnrollments } from "@/lib/safe-db";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student");

  const db = getDb();
  let enrollment: any = null;
  let clearance: Awaited<ReturnType<typeof computeClearance>> = null;
  let invoiceCount = 0;
  let openTickets = 0;
  let dbError: string | null = null;

  try {
    const enrollments = await safeUserEnrollments(user.id);
    enrollment = enrollments[0] || null;

    if (db) {
      try {
        if (enrollment?.id) {
          invoiceCount = await db.invoice.count({
            where: { enrollmentId: enrollment.id },
          });
        } else {
          invoiceCount = 0;
        }
      } catch {
        invoiceCount = 0;
      }

      try {
        openTickets = await db.supportTicket.count({
          where: {
            requesterId: user.id,
            status: { in: ["OPEN", "IN_PROGRESS"] },
          },
        });
      } catch {
        openTickets = 0;
      }
    }

    if (enrollment?.id) {
      try {
        clearance = await computeClearance(enrollment.id);
      } catch (e) {
        console.warn("[student dashboard] clearance", e);
      }
    }
  } catch (e) {
    console.error("[student dashboard]", e);
    dbError = e instanceof Error ? e.message : "Database query failed";
  }

  const firstName = user.firstName || user.email?.split("@")[0] || "Student";
  const programmeName = enrollment?.programme?.name || enrollment?.programmeName;
  const studentNumber = enrollment?.studentNumber;

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#0f766e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Student dashboard
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 28, color: "#07144a", letterSpacing: "-0.02em" }}>
          Welcome, {firstName}
        </h1>
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 15 }}>
          {enrollment
            ? `${programmeName || "Enrolled programme"}${studentNumber ? ` · ${studentNumber}` : ""}`
            : "No active enrolment yet — apply or continue an application."}
        </p>
      </div>

      {dbError && (
        <div className="campus-card" style={{ borderColor: "#fde68a", background: "#fffbeb" }}>
          <strong>Database notice</strong>
          <p style={{ margin: "6px 0 0", color: "#92400e", fontSize: 14 }}>
            Some records could not be loaded. Run <code>npx prisma db push</code> on the production
            database if this persists after deploy.
          </p>
        </div>
      )}

      <div className="campus-stat-grid">
        <div className="campus-stat">
          <div className="label">Enrolment</div>
          <div className="value" style={{ fontSize: 18 }}>
            {enrollment ? enrollmentStatusLabel(enrollment.status) : "None"}
          </div>
        </div>
        <div className="campus-stat">
          <div className="label">Clearance</div>
          <div className="value" style={{ fontSize: 18 }}>
            {clearance ? `${clearance.percentPaid}%` : "—"}
          </div>
        </div>
        <div className="campus-stat">
          <div className="label">Invoices</div>
          <div className="value">{invoiceCount}</div>
        </div>
        <div className="campus-stat">
          <div className="label">Open tickets</div>
          <div className="value">{openTickets}</div>
        </div>
      </div>

      {enrollment ? (
        <div className="campus-card">
          <h2 style={{ fontSize: 18 }}>Your programme</h2>
          <table className="campus-table">
            <tbody>
              <tr>
                <th style={{ width: 160 }}>Programme</th>
                <td>{programmeName || "—"}</td>
              </tr>
              <tr>
                <th>Student number</th>
                <td>{studentNumber || "Assigned at enrolment"}</td>
              </tr>
              <tr>
                <th>Status</th>
                <td>
                  <span className={`campus-badge ${enrollment.status === "ACTIVE" ? "ok" : "warn"}`}>
                    {enrollmentStatusLabel(enrollment.status)}
                  </span>
                </td>
              </tr>
              <tr>
                <th>Access level</th>
                <td>{enrollment.accessLevel || "LIMITED"}</td>
              </tr>
              {clearance && (
                <>
                  <tr>
                    <th>Finance</th>
                    <td>
                      {clearanceStatusLabel(clearance.status)} · Outstanding{" "}
                      {money(clearance.totalOutstanding)}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/student/learn" className="btn btn-primary btn-sm">
              Open learning
            </Link>
            <Link href="/student/finance" className="btn btn-outline-dark btn-sm">
              Finance
            </Link>
            <Link href="/student/id-card" className="btn btn-outline-dark btn-sm">
              Student ID
            </Link>
          </div>
        </div>
      ) : (
        <div className="campus-card">
          <h2 style={{ fontSize: 18 }}>Get started</h2>
          <p style={{ color: "#64748b", margin: "0 0 14px" }}>
            You are signed in, but there is no active enrolment linked to this account yet.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/admissions/apply" className="btn btn-primary btn-sm">
              Apply to a programme
            </Link>
            <Link href="/applicant" className="btn btn-outline-dark btn-sm">
              Applicant portal
            </Link>
          </div>
        </div>
      )}

      <div className="campus-card">
        <h2 style={{ fontSize: 18, marginBottom: 14 }}>Quick links</h2>
        <div className="campus-link-grid">
          {[
            { href: "/student/learn", title: "Learning", desc: "Modules & lessons" },
            { href: "/student/classes", title: "Live classes", desc: "Timetable & Meet" },
            { href: "/student/assignments", title: "Assignments", desc: "Submit work" },
            { href: "/student/exams", title: "Exams", desc: "Final assessments" },
            { href: "/student/grades", title: "Grades", desc: "Results" },
            { href: "/student/finance", title: "Finance", desc: "Invoices & clearance" },
            { href: "/student/library", title: "Library", desc: "Resources & books" },
            { href: "/student/support", title: "Support", desc: "Student Affairs" },
            { href: "/student/profile", title: "Profile", desc: "Your details" },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="campus-link-tile">
              <strong>{x.title}</strong>
              <span>{x.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
