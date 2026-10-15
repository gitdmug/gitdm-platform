import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";

export const metadata = { title: `Admissions | ${GITDM.shortName}`, description: "How to apply, pay, receive an admissions decision and begin learning at GITDM." };

export default function AdmissionsPage() {
  return <>
    <Header active="/admissions" />
    <main>
      <section className="page-hero"><div className="container"><div className="eyebrow">Admissions</div><h1>Know exactly what happens after you click Apply.</h1><p>GITDM is designed so applicants can follow one clear journey: application → confirmation → application fee → receipt → Admissions review → decision → tuition → campus access.</p></div></section>
      <section className="section"><div className="container"><div className="intake-banner" style={{ marginBottom: 30 }}><div><strong>October 2026 intake</strong><div className="tile-meta">Current programme availability is maintained from the institutional academic catalogue.</div></div><Link href="/admissions/apply" className="btn btn-primary">Start application</Link></div>
        <div className="grid grid-4">
          {[["01","Create", "Sign in or create your GITDM account and select the programme you want to study."],["02","Complete", "Enter your application information and upload proof of identity and education."],["03","Confirm & pay", "Submit the application, receive confirmation, then pay the UGX 10,000 application fee through Pesapal."],["04","Decision", "Admissions reviews your file, may interview you, then records admitted or rejected status. Rejected applicants can appeal."]].map(([n,t,b])=><article className="card" key={n}><div className="eyebrow">{n}</div><h3>{t}</h3><p>{b}</p></article>)}
        </div>
      </div></section>

      <section className="section alt"><div className="container grid grid-2" style={{ alignItems: "start", gap: 40 }}><div><div className="eyebrow">What you need</div><h2>Prepare your admission file before you start.</h2><ul className="feature-list"><li>Valid proof of identity</li><li>Proof of education — minimum secondary education / Uganda S4 equivalent</li><li>Active email address and phone number</li><li>Accurate personal and contact information</li><li>Any additional evidence requested by Admissions</li></ul><p className="section-intro" style={{ marginTop: 20 }}>The application fee is separate from tuition. Paying it confirms the application-processing charge; it does not guarantee admission.</p></div><div className="stack"><div className="panel"><h3>Application fee</h3><p style={{ fontSize: 22, color: "var(--navy)", fontWeight: 850, marginTop: 8 }}>UGX 10,000</p><p>Paid online through Pesapal after the application is submitted. A payment receipt is generated and linked to your application.</p></div><div className="panel"><h3>Tuition after admission</h3><p>Once admitted, your student workspace shows the programme tuition invoice. The current short-course tuition is the amount shown on the selected programme invoice.</p></div></div></div></section>

      <section className="section"><div className="container"><div className="eyebrow">After you apply</div><h2>Your application stays visible.</h2><div className="grid grid-3" style={{ marginTop: 24 }}><article className="card"><h3>Track status</h3><p>See whether your application is submitted, under review, awaiting information, admitted or rejected from the same account.</p></article><article className="card"><h3>Receive records</h3><p>Payment confirmations and official receipts are linked to your account. Admissions updates are also sent as notifications.</p></article><article className="card"><h3>Appeal if rejected</h3><p>If Admissions rejects your application, the application page provides an appeal route where you can submit new information or clarification for reconsideration.</p></article></div></div></section>

      <section className="section navy"><div className="container"><div className="eyebrow">Important distinction</div><h2>Education first. No promises of trading income.</h2><p className="section-intro">GITDM's programmes are educational. We do not present trading as guaranteed income, and completing a programme does not guarantee profits, funding, employment or investment returns.</p><div className="actions"><Link href="/admissions/apply" className="btn btn-light">Apply now</Link><Link href="/programmes" className="btn btn-outline">Compare programmes</Link></div></div></section>
    </main>
    <Footer />
  </>;
}
