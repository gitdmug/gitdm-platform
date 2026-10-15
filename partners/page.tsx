import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { PartnerImage } from "@/components/PartnerImage";

export const metadata = {
  title: `Partners | ${GITDM.shortName}`,
  description: "GITDM education and industry partners.",
};

const smariImage = "/media/gitdm-education-partner.jpeg";  // generated: academic collaboration
const marketImage = "/media/gitdm-pepperstone-platform.jpg"; // generated: pro trading platform, NOT class
const pepperstoneReferral = "https://trk.pepperstonepartners.com/aff_c?aff_id=41454&offer_id=381&referral_provider=tune_link&url_id=956";

export default function PartnersPage() {
  return (
    <>
      <Header active="/partners" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Partners</div>
            <h1>Education meets market practice.</h1>
            <p>GITDM connects learners with education and industry relationships that make financial-markets learning more practical and career-aware.</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="eyebrow">Industry Partner</div>
            <h2>Pepperstone</h2>
            <div className="partner-feature-card">
              <div className="partner-feature-image"><img src={marketImage} alt="Professional trading platform and market tools – Pepperstone partnership" className="public-image"/></div>
              <div className="partner-feature-content">
                <div className="partner-wordmark pepper-wordmark"><img src="/media/pepperstone-icon.png" alt="Pepperstone icon" className="pepperstone-icon"/><span>pepperstone</span></div>
                <h3>Industry Partner</h3>
                <p>Pepperstone is GITDM's industry partner, connecting learners with a recognised trading platform and market technology. Opening an account is optional and separate from GITDM enrolment; it is not required to study with us.</p>
                <div className="meta"><span className="chip chip-accent">Industry partner</span><span className="chip">Trading technology</span><span className="chip">External account</span></div>
                <div className="actions"><a className="btn btn-primary" href={pepperstoneReferral} target="_blank" rel="sponsored noopener noreferrer">Create Pepperstone Account</a><a className="btn btn-outline-dark" href={pepperstoneReferral} target="_blank" rel="sponsored noopener noreferrer">Learn about us</a></div>
                <p className="risk-note">Risk warning: CFDs are complex instruments and carry a high risk of losing money rapidly due to leverage. Trading is risky and losses can exceed expectations. This partner link does not constitute financial advice or a recommendation to trade.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section alt">
          <div className="container">
            <div className="eyebrow">Education &amp; Academic Partner</div>
            <h2>SMARI Skilling Institute</h2>
            <div className="partner-feature-card reverse">
              <div className="partner-feature-image"><PartnerImage src={smariImage} alt="SMARI education and academic partnership" className="public-image" fallbackLabel="SMARI Skilling Institute" /></div>
              <div className="partner-feature-content">
                <div className="partner-wordmark smari-wordmark"><img src="https://ik.imagekit.io/67mog36hf/Smari%20sample/smari_web_logo.svg?updatedAt=1756913426328" alt="SMARI Institute logo" className="partner-logo-wide"/><small>SKILLING INSTITUTE</small></div>
                <h3>Education &amp; Academic Partner</h3>
                <p>SMARI Skilling Institute is GITDM's education and academic partner. The collaboration supports practical training, curriculum development, student mentorship and progression pathways.</p>
                <div className="meta"><span className="chip chip-accent">Education partner</span><span className="chip">Victoria University Kampala</span><span className="chip">Kampala</span></div>
                <div className="actions"><a className="btn btn-primary" href="https://smari.ac.ug/" target="_blank" rel="noreferrer">Visit SMARI Institute</a><a className="btn btn-outline-dark" href="https://vu.ac.ug/" target="_blank" rel="noreferrer">Visit Victoria University</a></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-header"><div><div className="eyebrow">Partner network</div><h2>Collaboration with a purpose.</h2><p className="section-intro">Education partners strengthen learning and progression. Industry partners connect learners to real market tools and professional environments.</p></div><Link href="/contact" className="btn btn-primary btn-sm">Discuss partnership</Link></div>
            <div className="grid grid-3"><article className="card"><div className="eyebrow">Education</div><h3>Academic collaboration</h3><p>Curriculum quality, practical training, mentorship and progression pathways.</p></article><article className="card"><div className="eyebrow">Industry</div><h3>Market exposure</h3><p>Access to platforms, tools and industry perspectives alongside formal education.</p></article><article className="card"><div className="eyebrow">GITDM</div><h3>Responsible positioning</h3><p>Partnerships complement education. They do not change GITDM's commitment to structured learning, risk awareness and academic evidence.</p><div className="actions"><Link href="/about" className="btn btn-outline-dark btn-sm">About GITDM</Link></div></article></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
