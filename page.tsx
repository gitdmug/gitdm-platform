import Link from "next/link";
import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { PartnerImage } from "@/components/PartnerImage";
import { listPublishedAnnouncements } from "@/lib/announcements";

export const dynamic = "force-dynamic";

const images = {
  hero: "/media/gitdm-hero-live-chart.jpg",          // generated: professional live chart workstation
  learning: "/media/gitdm-classroom-coaching.jpg",   // real: instructor coaching at laptop
  professional: "/media/gitdm-group-table-session.jpg", // real: group around table
  markets: "/media/gitdm-markets-overview.jpg",      // generated: multi-screen markets room
  analysis: "/media/gitdm-ta-analyst.jpg",           // generated: analyst drawing levels
  classroom: "/media/gitdm-instructor-live-chart.jpg", // real: instructor at live chart
};

export default async function Home() {
  const announcements = await listPublishedAnnouncements("PUBLIC");
  return <>
    <Header />
    <main>
      <section className="hero" style={{ backgroundImage: `linear-gradient(105deg, rgba(7,20,74,.97) 0%, rgba(7,20,74,.86) 55%, rgba(7,20,74,.58) 100%), url(${images.hero})` }}>
        <div className="container">
          <div className="eyebrow">Global Institute of Trading and Derivatives Markets · Kampala</div>
          <h1>Build real financial-markets knowledge. Learn with structure. Progress with evidence.</h1>
          <p>{GITDM.name} is a digital financial-markets institution built for people who want more than scattered videos and social-media tips — structured programmes, guided learning, assessment, academic records and a clear path from application to completion.</p>
          <div className="actions"><Link href="/admissions/apply" className="btn btn-primary">Apply for October intake</Link><Link href="/programmes" className="btn btn-outline">Explore programmes</Link><Link href="/about" className="btn btn-outline">Why GITDM</Link></div>
          <div className="hero-ad-wrap" aria-label="Pepperstone partner advertisement"><ins className="dcmads" style={{display:"inline-block",width:320,height:50}} data-dcm-placement="N800570.2009906CELLXPERT/B24282330.340388762" data-dcm-rendering-mode="iframe" data-dcm-https-only data-dcm-click-tracker="https://trk.pepperstonepartners.com/aff_c?offer_id=382&aff_id=41454&file_id=5934&referral_provider=tune_creative" data-dcm-gdpr-applies="gdpr=${GDPR}" data-dcm-gdpr-consent="gdpr_consent=${GDPR_CONSENT_755}" data-dcm-addtl-consent="addtl_consent=${ADDTL_CONSENT}" data-dcm-ltd="false" data-dcm-resettable-device-id="" data-dcm-app-id=""></ins><Script src="https://www.googletagservices.com/dcm/dcmads.js" strategy="afterInteractive" /></div>
          <div className="stats">
            <div className="stat"><strong>1–3</strong><span>month short programmes currently open</span></div>
            <div className="stat"><strong>2 Nov</strong><span>2026 classes start</span></div>
            <div className="stat"><strong>UGX 400k</strong><span>Technical Analysis tuition</span></div>
            <div className="stat"><strong>UGX 600k</strong><span>Beginner Forex tuition</span></div>
          </div>
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="section" style={{ background: "#f8faf9", paddingTop: 32, paddingBottom: 32 }}>
          <div className="container">
            <div className="eyebrow">Notices</div>
            <h2 style={{ marginTop: 8 }}>Announcements</h2>
            <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
              {announcements.slice(0, 3).map((a) => (
                <article key={a.id} className="card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: 18, margin: 0 }}>{a.title}</h3>
                  <p style={{ marginTop: 8, color: "#475569", fontSize: 14, whiteSpace: "pre-wrap" }}>
                    {a.body.length > 220 ? a.body.slice(0, 220) + "…" : a.body}
                  </p>
                </article>
              ))}
            </div>
            <p style={{ marginTop: 16 }}>
              <Link href="/announcements" className="btn btn-outline-dark btn-sm">All announcements</Link>
            </p>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: "center", gap: 42 }}>
            <div><div className="eyebrow">Why GITDM exists</div><h2>Financial education should have a system behind it.</h2><p className="section-intro">The financial markets are too important to learn through disconnected content alone. GITDM combines curriculum, faculty-led learning, assessments, student support, finance controls and academic records in one institutional environment.</p><div className="grid grid-2"><div className="public-stat"><strong>Structured</strong><span>Defined programme, modules and learning outcomes</span></div><div className="public-stat"><strong>Practical</strong><span>Market concepts connected to real decision-making</span></div><div className="public-stat"><strong>Measured</strong><span>Assignments, quizzes, examinations and progress</span></div><div className="public-stat"><strong>Recorded</strong><span>Receipts, results, transcripts and certificates</span></div></div></div>
            <div className="image-frame"><img className="public-image" src={images.professional} alt="Professionals collaborating in a modern workspace"/><div className="image-caption"><strong>A financial-markets institution, not a signal room.</strong><span>Learn the framework, practise the process, build disciplined market knowledge.</span></div></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">What you can study at GITDM</div>
          <h2>Learn. Practise. Progress.</h2>
          <p className="section-intro">GITDM offers structured programmes in financial markets, trading and derivatives for beginners, aspiring traders and people who want formal, practical financial-market education.</p>
          <div className="grid grid-3" style={{marginTop:28}}>
            <article className="card visual-card"><img className="public-image card-image" src={images.markets} alt="Financial markets displayed on trading screens"/><div className="card-body"><div className="eyebrow">Learn</div><h3>Understand the markets</h3><p>Financial markets, Forex, technical analysis, market structure, derivatives, investment concepts and financial business.</p></div></article>
            <article className="card visual-card"><img className="public-image card-image" src={images.analysis} alt="Trader analysing market charts"/><div className="card-body"><div className="eyebrow">Practise</div><h3>Build a market process</h3><p>Market analysis, trade planning, risk management, journaling, case studies and practical assignments.</p></div></article>
            <article className="card visual-card"><img className="public-image card-image" src={images.classroom} alt="Students learning together"/><div className="card-body"><div className="eyebrow">Progress</div><h3>Show your learning</h3><p>Quizzes, examinations, academic records, certificates and student support connected inside one institutional campus.</p></div></article>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-header"><div><div className="eyebrow">Find your starting point</div><h2>What are you looking for?</h2><p className="section-intro">Choose the learning path that matches where you are today.</p></div><Link href="/programmes" className="btn btn-outline-dark btn-sm">View full catalogue</Link></div>
          <div className="grid grid-3">
            <article className="card"><div className="eyebrow">Beginner</div><h3>I want to learn Forex</h3><p>Start with the fundamentals, technical analysis, trade planning, risk management and disciplined execution.</p><div className="actions"><Link href="/programmes#beginner-forex" className="btn btn-primary btn-sm">View Forex path</Link></div></article>
            <article className="card"><div className="eyebrow">Focused skill</div><h3>I want to learn Technical Analysis</h3><p>Build a practical foundation in market structure, support and resistance, supply and demand and trade planning.</p><div className="actions"><Link href="/programmes#technical-analysis" className="btn btn-primary btn-sm">View analysis path</Link></div></article>
            <article className="card"><div className="eyebrow">Broader study</div><h3>I want wider financial-market education</h3><p>Explore the Certificate in Financial Markets, Trading and Derivatives and the current programme catalogue.</p><div className="actions"><Link href="/programmes#financial-markets" className="btn btn-primary btn-sm">Explore catalogue</Link></div></article>
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <div className="section-header"><div><div className="eyebrow">October 2026 intake</div><h2>Two programmes are open now.</h2><p className="section-intro">Both programmes begin classes on 2 November 2026. The flagship one-year certificate remains part of the wider catalogue but is not open for the October intake.</p></div><Link href="/admissions/apply" className="btn btn-primary btn-sm">Start application</Link></div>
          <div className="grid grid-2">
            <article className="card programme-card"><div className="eyebrow">1 month · Technical Analysis</div><h3 style={{ fontSize: 24 }}>Certificate in Technical Analysis</h3><p>Intensive foundations in market structure, support and resistance, supply and demand, trend analysis, break-and-retest logic, trade planning and risk management.</p><div className="programme-price">UGX 400,000 <small>tuition</small></div><div className="meta"><span className="chip">Application UGX 10,000</span><span className="chip chip-accent">Starts 2 Nov 2026</span></div><div className="actions" style={{ marginTop: "auto", paddingTop: 22 }}><Link href="/admissions/apply" className="btn btn-primary">Apply now</Link><Link href="/programmes#technical-analysis" className="btn btn-outline-dark">Programme details</Link></div></article>
            <article className="card programme-card"><div className="eyebrow">3 months · Beginner Forex</div><h3 style={{ fontSize: 24 }}>Certificate in Beginner Forex Trading</h3><p>Start from the market basics and progress through technical analysis, trade planning, risk management, execution, journaling and trading discipline.</p><div className="programme-price">UGX 600,000 <small>tuition</small></div><div className="meta"><span className="chip">Application UGX 10,000</span><span className="chip chip-accent">Starts 2 Nov 2026</span></div><div className="actions" style={{ marginTop: "auto", paddingTop: 22 }}><Link href="/admissions/apply" className="btn btn-primary">Apply now</Link><Link href="/programmes#beginner-forex" className="btn btn-outline-dark">Programme details</Link></div></article>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid-2" style={{ alignItems: "center", gap: 42 }}>
          <div className="image-frame"><img className="public-image" src={images.learning} alt="Students learning together in a classroom"/><div className="image-caption"><strong>Learn inside a digital campus.</strong><span>Courses, resources, assessments, results, finance and student support stay connected.</span></div></div>
          <div><div className="eyebrow">What you receive</div><h2>A complete learner journey.</h2><ul className="feature-list"><li>Structured programme and course content rather than disconnected lessons</li><li>Digital campus access for learning resources and academic activity</li><li>Assignments, quizzes and examinations where the programme requires them</li><li>Student finance with invoices, online payments and official receipts</li><li>Admission status and institutional notifications in one account</li><li>Academic records, completion documentation and support workflows</li></ul><div className="actions"><Link href="/campus" className="btn btn-outline-dark">See the campus</Link><Link href="/admissions" className="btn btn-primary">Understand admissions</Link></div></div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{alignItems:"center",gap:42}}>
            <div><div className="eyebrow">Who is GITDM for?</div><h2>A path for different stages of the journey.</h2><div className="stack"><div className="staff-notice"><strong>Complete beginners</strong><p>Understand how markets work before taking on market risk.</p></div><div className="staff-notice"><strong>Aspiring traders</strong><p>Replace scattered videos and social-media strategies with structured learning.</p></div><div className="staff-notice"><strong>Existing traders</strong><p>Strengthen analysis, planning, risk management and discipline.</p></div><div className="staff-notice"><strong>Financial-market learners</strong><p>Build broader knowledge of trading, derivatives and the financial ecosystem.</p></div></div></div>
            <div className="image-frame"><img className="public-image" src={images.analysis} alt="Financial market analysis on a screen"/><div className="image-caption"><strong>Not signals. Not hype. Education.</strong><span>Learn how to understand the market, analyse opportunities, manage risk and build a repeatable decision-making process.</span></div></div>
          </div>
        </div>
      </section>

      <section className="section alt" id="journey">
        <div className="container"><div className="eyebrow">Your journey at GITDM</div><h2>From application to completion.</h2><div className="grid grid-4" style={{marginTop:28}}>{[['01','Apply','Submit your application and required documents.'],['02','Admissions','Your application is reviewed by the Admissions team.'],['03','Enrol','Complete required payment and receive student access.'],['04','Learn','Access classes, notes, resources and activities.'],['05','Practise','Complete assignments, quizzes and practical activities.'],['06','Assess','Complete required examinations and assessments.'],['07','Complete','Receive academic results and completion documentation.'],['08','Progress','Continue to another programme or build on your knowledge.']].map(([n,t,d])=><div className="card journey-step" key={n}><span className="journey-number">{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></div>
      </section>

      <section className="section partner-highlight">
        <div className="container">
          <div className="grid grid-2" style={{alignItems:"center",gap:24}}>
            <div><div className="eyebrow">Education &amp; industry network</div><h2>Learn with an institution connected to education and market practice.</h2><p className="section-intro">GITDM works with education and industry partners to strengthen practical learning. Pepperstone is our industry partner, followed by SMARI Skilling Institute as our education and academic partner.</p><div className="actions"><Link href="/partners" className="btn btn-primary">Meet our partners</Link></div></div>
            <div className="partner-mini-grid">
              <div className="partner-mini"><div className="partner-logo pepper-logo"><img src="/media/pepperstone-icon.png" alt="Pepperstone icon" /><span>pepperstone</span></div><strong>Pepperstone</strong><span>Industry Partner</span></div>
              <div className="partner-mini"><div className="partner-logo smari-logo"><PartnerImage src="https://ik.imagekit.io/67mog36hf/Smari%20sample/smari_web_logo.svg?updatedAt=1756913426328" alt="SMARI Skilling Institute logo" fallbackLabel="SMARI" /><span>SMARI</span></div><strong>SMARI Skilling Institute</strong><span>Education &amp; Academic Partner</span></div>
            </div>
          </div>
        </div>
      </section>


      <section className="section navy">
        <div className="container"><div className="eyebrow">The outcome</div><h2>Leave with a framework you can keep using.</h2><p className="section-intro">GITDM does not promise profits or instant income. The objective is to help learners understand markets, manage risk, interpret price behaviour, build repeatable processes and make better-informed financial decisions.</p><div className="grid grid-4"><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Knowledge</h3><p>Understand the language, structure and mechanics of markets.</p></div><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Process</h3><p>Develop a defined approach to analysis, planning and execution.</p></div><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Discipline</h3><p>Use risk management, records and review to improve decision quality.</p></div><div className="panel" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.12)" }}><h3 style={{ color: "#fff" }}>Evidence</h3><p>Progress through assessed work and institutional academic records.</p></div></div><div className="actions"><Link href="/admissions/apply" className="btn btn-light">Apply for the October intake</Link><Link href="/contact" className="btn btn-outline">Talk to GITDM</Link></div></div>
      </section>
    </main>
    <Footer />
  </>;
}
