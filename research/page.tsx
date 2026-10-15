import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { MarketInsightsDashboard } from "@/components/MarketInsightsDashboard";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Research | ${GITDM.shortName}`,
  description:
    "Market movement monitor, news, AI-assisted educational analysis, economic calendar and performance journal.",
};

export default async function ResearchPage() {
  const user = await getCurrentUser();
  let isStudent = false;
  if (user) {
    try {
      const db = getDb();
      if (db) {
        const enrollment = await db.enrollment.findFirst({
          where: {
            userId: user.id,
            status: { in: ["ACTIVE", "REPEATING", "COMPLETED"] },
          },
          select: { id: true },
        });
        isStudent = Boolean(enrollment);
        if (!isStudent) {
          const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
          isStudent = roleCodes.some((c: string) =>
            ["STUDENT", "ALUMNI", "LECTURER", "PRINCIPAL", "ACADEMIC_DIRECTOR"].includes(c)
          );
        }
      }
    } catch {
      isStudent = Boolean(user);
    }
  }

  return (
    <>
      <Header active="/research" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Research</div>
            <h1>Market intelligence, with context.</h1>
            <p>
              Monitor selected instruments, review market headlines and build a structured view of
              technical and fundamental scenarios. Public visitors can browse the feed; enrolled
              students unlock AI-assisted analysis and deeper tools.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
              <Link className="btn btn-outline-dark btn-sm" href="/research/economic-calendar">
                Economic calendar
              </Link>
              <Link className="btn btn-outline-dark btn-sm" href="/research/journal">
                Performance journal
              </Link>
              <Link className="btn btn-outline-dark btn-sm" href="/research/analysis">
                Last detailed analysis
              </Link>
              {isStudent ? (
                <span className="chip chip-accent">Student research access</span>
              ) : (
                <Link className="btn btn-primary btn-sm" href="/admissions/apply">
                  Enrol for full research tools
                </Link>
              )}
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container">
            {/* Public: market monitor + news. Students: canAnalyse enables AI scenario analysis */}
            <MarketInsightsDashboard canAnalyse={isStudent} />
            {!isStudent && (
              <div className="panel" style={{ marginTop: 24 }}>
                <strong>Student-only tools</strong>
                <p>
                  AI-assisted educational scenario analysis, extended instrument study, and
                  performance journaling are available to enrolled learners. Public visitors retain
                  live market monitoring and headlines (BiQuote / fallback feeds).
                </p>
                <Link href="/admissions/apply" className="btn btn-outline-dark btn-sm">
                  Apply to study
                </Link>
              </div>
            )}
            <p className="muted" style={{ marginTop: 24 }}>
              Market commentary is educational information, not investment advice. Prices can be
              delayed or incomplete. Verify data from primary sources before making financial
              decisions.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
