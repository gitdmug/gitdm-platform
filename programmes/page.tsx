import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { listPublishedProgrammes } from "@/lib/safe-db";
export const metadata = { title: `Programmes | ${GITDM.shortName}`, description: "GITDM current intake programmes and course catalogue." };
export const dynamic = "force-dynamic";

const programmeImages: Record<string,string> = {
  "GITDM-TA1M": "/media/gitdm-prog-technical-analysis.jpg",
  "GITDM-FX3M": "/media/gitdm-prog-forex.jpg",
  "GITDM-CFMTD": "/media/gitdm-prog-certificate.jpg",
};

export default async function ProgrammesPage() {
  const programmes: any[] = await listPublishedProgrammes();
  const openProgrammes = programmes.filter((p: any) => p.applicationsOpen !== false);
  const catalogueProgrammes = programmes.filter((p: any) => p.applicationsOpen === false);
  const displayCourseCount = (programme: any) => (programme.courses?.length ?? 0);
  const totalCourses = programmes.reduce((n, p) => n + displayCourseCount(p), 0);

  return <>
    <Header active="/programmes" />
    <main>
      <section className="page-hero"><div className="container"><div className="eyebrow">Programme catalogue</div><h1>Choose your route into the markets.</h1><p>GITDM brings focused short courses and longer academic pathways into one connected catalogue. Start with the programmes currently accepting applications, or explore every course before deciding.</p></div></section>
      <section className="section"><div className="container">
        <div className="intake-banner" style={{ marginBottom: 28 }}><div><strong>Current applications</strong><div className="tile-meta">The Academic Directorate controls which programmes are open for application.</div></div><Link href="/admissions" className="btn btn-primary btn-sm">Admissions process</Link></div>
        <div className="eyebrow">OPEN FOR APPLICATION</div><h2>Current intake programmes</h2><p className="section-intro">These are the first programmes a visitor should see when arriving at the catalogue. Up to three open programmes are featured here.</p>
        {openProgrammes.length ? <div className="grid grid-3" style={{ marginTop: 24 }}>{openProgrammes.map(programme => <article className="card programme-card visual-card" key={programme.id}>
          <img className="public-image card-image" src={programmeImages[programme.code] || programmeImages["GITDM-CFMTD"]} alt={`${programme.name} learning visual`} />
          <div className="card-body"><div className="eyebrow">OPEN FOR ADMISSIONS</div><h2>{programme.name}</h2><p>{programme.description}</p><div className="programme-price">{programme.currency} {Number((programme.periods?.[0]?.feeAmount) || programme.applicationFee).toLocaleString("en-UG")} <small>{programme.periods?.[0] ? "per period" : "programme"}</small></div><div className="meta"><span className="chip">{programme.durationMonths} months</span><span className="chip">{displayCourseCount(programme)} course{displayCourseCount(programme) === 1 ? "" : "s"}</span><span className="chip">{programme.intakeLabel || "Structured online learning"}</span></div><div className="actions" style={{ marginTop: "auto", paddingTop: 22 }}><Link href={`/admissions/apply?programmeId=${encodeURIComponent(programme.id)}`} className="btn btn-primary">Apply</Link><Link href="/admissions" className="btn btn-outline-dark">Admissions process</Link></div></div>
        </article>)}</div> : <div className="panel" style={{ marginTop: 24 }}><h3>No programmes are currently open</h3><p>Admissions will appear here when the Academic Directorate opens the next intake.</p></div>}
      </div></section>

      <section className="section alt"><div className="container"><div className="grid grid-2" style={{ alignItems: "center" }}><div><div className="eyebrow">COMPLETE COURSE CATALOGUE</div><h2>{totalCourses} published courses, organised by delivery length.</h2><p>Every public course is now grouped into a one-month, three-month or twelve-month delivery band. Open a course to see its modules, study frequency, learning pathway and the questions a prospective student needs answered before choosing it.</p><div className="actions"><Link href="/programmes/courses" className="btn btn-primary">View more courses</Link></div></div><div className="card"><div className="grid grid-3"><div className="panel"><div className="eyebrow">1 MONTH</div><h3>3× weekly</h3><p>Focused intensive delivery.</p></div><div className="panel"><div className="eyebrow">3 MONTHS</div><h3>2× weekly</h3><p>Deeper professional delivery.</p></div><div className="panel"><div className="eyebrow">12 MONTHS</div><h3>Extended</h3><p>Long-form academic pathway.</p></div></div></div></div></div></section>

      {catalogueProgrammes.length ? <section className="section"><div className="container"><div className="eyebrow">LONGER PROGRAMMES</div><h2>Other published programme pathways</h2><p className="section-intro">These programmes remain in the catalogue even when applications are not currently open.</p><div className="grid grid-2" style={{ marginTop: 24 }}>{catalogueProgrammes.map(programme => <article className="card" key={programme.id}><div className="eyebrow">CATALOGUE</div><h3>{programme.name}</h3><p>{programme.description}</p><div className="meta"><span className="chip">{programme.durationMonths} months</span><span className="chip">{displayCourseCount(programme)} course{displayCourseCount(programme) === 1 ? "" : "s"}</span></div><div className="actions" style={{ marginTop: 18 }}><Link href="/programmes/courses" className="btn btn-outline-dark btn-sm">View courses</Link></div></article>)}</div></div></section> : null}

      <section className="section navy"><div className="container"><div className="eyebrow">How programmes work</div><h2>One academic journey from enrolment to completion.</h2><div className="grid grid-4"><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Learn</h3><p>Follow your course content and scheduled academic activities.</p></div><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Practise</h3><p>Work through practical tasks, market exercises and guided review.</p></div><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Assess</h3><p>Complete the assessments attached to your programme and courses.</p></div><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Complete</h3><p>Progress toward your academic record and completion documentation.</p></div></div></div></section>
    </main>
    <Footer />
  </>;
}
