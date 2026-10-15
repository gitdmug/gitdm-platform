import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";
import { redirect } from "next/navigation";
import { startApplication } from "./actions";
import { GITDM } from "@/lib/branding";
import { listOpenApplicationProgrammes, safeUserEnrollments } from "@/lib/safe-db";

export const dynamic = "force-dynamic";
export const metadata = { title: `Apply | ${GITDM.shortName}` };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/admissions/apply");
  const db = getDb();
  if (!db) {
    return (
      <>
        <Header active="/admissions" />
        <main className="section">
          <div className="container">
            <h1>Apply to GITDM</h1>
            <p>Admissions is temporarily unavailable. Please try again shortly or contact {GITDM.admissionsEmail || "admissions@globalinstituteoftrading.com"}.</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  const programmes = await listOpenApplicationProgrammes();
  const running = await safeUserEnrollments(user.id);
  const runningShort = running.some((e: any) => (e.programme?.durationMonths ?? 12) < 12);
  const runningLong = running.some((e: any) => (e.programme?.durationMonths ?? 0) >= 12);
  let hasShortApplication = null;
  try {
    hasShortApplication = runningLong
      ? await db.application.findFirst({
          where: {
            applicantId: user.id,
            status: { in: ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "ADDITIONAL_INFORMATION", "ACCEPTED", "ADMITTED", "FEE_PENDING"] },
          },
          select: { id: true },
        })
      : null;
  } catch {
    hasShortApplication = null;
  }
  const canApply = !running.length || (runningLong && !runningShort && !hasShortApplication);
  return <>
    <Header active="/admissions" />
    <main>
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">October 2026 intake</div>
          <h1>Apply to GITDM.</h1>
          <p>Published programmes that are currently open for applications are listed below. Programme start dates and fees are shown from the institutional catalogue.</p>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="intake-banner" style={{ marginBottom: 28 }}><div><strong>Applications currently open</strong><div className="tile-meta">Application fee: UGX 10,000 · Minimum education: secondary education / Uganda S4 equivalent · Identity and education documents required</div></div><Link href="/admissions" className="btn btn-outline-dark btn-sm">View admissions process</Link></div>
          {running.length ? <div className="access-banner" style={{ marginBottom: 28 }}><strong>Current programme: {running[0].programme.name}</strong><p style={{ margin: "8px 0 0" }}>{canApply ? "Because your current programme is 12 months, you may apply for one 1-month short course only." : "You already have a running programme. You cannot start another programme until it is completed."}</p></div> : null}
          <div className="grid grid-2">
            {programmes.map((p) => <article className="card programme-card" key={p.id}>
              <div className="eyebrow">{p.code}</div>
              <h2 style={{ marginTop: 8 }}>{p.name}</h2>
              <p>{p.description}</p>
              <div className="programme-price">{p.currency} {Number(p.periods[0]?.feeAmount || 0).toLocaleString("en-UG")} <small>programme tuition</small></div>
              <div className="meta"><span className="chip">{p.durationMonths} month{p.durationMonths === 1 ? "" : "s"}</span><span className="chip chip-gold">Application fee {p.currency} {Number(p.applicationFee).toLocaleString("en-UG")}</span><span className="chip chip-accent">Classes start 2 Nov 2026</span></div>
              <ul className="feature-list" style={{ marginTop: 18 }}>
                {p.durationMonths === 1 ? <><li>Market structure and technical analysis foundations</li><li>Support, resistance, supply and demand</li><li>Trade planning, entries and risk management</li><li>Practical learning through the digital campus</li></> : <><li>Forex market foundations and terminology</li><li>Technical analysis and trade planning</li><li>Risk management and trading discipline</li><li>Structured assessments and practical trading work</li></>}
              </ul>
              <div className="actions" style={{ marginTop: "auto", paddingTop: 20 }}>{(!running.length || (runningLong && !runningShort && !hasShortApplication && p.durationMonths === 1)) ? <form action={startApplication}><input type="hidden" name="programmeId" value={p.id} /><button className="btn btn-primary" type="submit">Start application</button></form> : <span className="btn btn-outline-dark" aria-disabled="true">Not available while enrolled</span>}<Link href="/contact" className="btn btn-outline-dark">Ask Admissions</Link></div>
            </article>)}
          </div>
          {!programmes.length ? <div className="panel"><h2>No programmes are open right now.</h2><p>Admissions will publish the next intake when applications open.</p></div> : null}
        </div>
      </section>
      <section className="section alt">
        <div className="container grid grid-2" style={{ alignItems: "start" }}>
          <div><div className="eyebrow">Your application journey</div><h2>Simple for the applicant. Controlled for the institution.</h2><p className="section-intro">Create your account, choose a programme, upload the required documents, submit the application, pay the application fee, receive your receipt, then track the Admissions decision from the same application page.</p></div>
          <div className="stack"><div className="panel"><strong>1 · Submit</strong><p>Complete your application and attach proof of identity and education.</p></div><div className="panel"><strong>2 · Pay</strong><p>Pay the UGX 10,000 application fee securely through Pesapal and receive a receipt.</p></div><div className="panel"><strong>3 · Admissions</strong><p>Admissions reviews your file and may schedule an interview or request additional information.</p></div><div className="panel"><strong>4 · Decision & onboarding</strong><p>Track admitted or rejected status. If admitted, tuition and campus access appear in your student workspace. A rejected application can be appealed.</p></div></div>
        </div>
      </section>
    </main>
    <Footer />
  </>;
}
