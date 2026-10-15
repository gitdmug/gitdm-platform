import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { submitEnquiry } from "./actions";

export const metadata = {
  title: `Contact | ${GITDM.shortName}`,
  description: "Contact GITDM admissions and institutional support.",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  return (
    <>
      <Header active="/contact" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Contact</div>
            <h1>Talk to GITDM.</h1>
            <p>
              Admissions, partnerships and general enquiries. We respond through the
              institutional channels below.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container grid grid-2" style={{ gap: 40, alignItems: "start" }}>
            <div className="stack">
              <div className="panel">
                <h3>Email</h3>
                <p>
                  <strong>General support</strong><br />
                  <a href={`mailto:${GITDM.supportEmail}`}>{GITDM.supportEmail}</a>
                  <br /><br />
                  <strong>Admissions</strong><br />
                  <a href={`mailto:${GITDM.admissionsEmail}`}>{GITDM.admissionsEmail}</a>
                </p>
              </div>
              <div className="panel">
                <h3>WhatsApp</h3>
                <p>
                  <a
                    href={`https://wa.me/256${GITDM.whatsapp.replace(/^0/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {GITDM.whatsapp}
                  </a>
                </p>
              </div>
              <div className="panel">
                <h3>Location</h3>
                <p>{GITDM.location}</p>
              </div>
              <div className="panel">
                <h3>Website</h3>
                <p>
                  <a href={GITDM.website} target="_blank" rel="noreferrer">
                    {GITDM.website}
                  </a>
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: 28 }}>
              <h3 style={{ marginTop: 0 }}>Enquiry form</h3>
              {params.status === "sent" ? <div className="access-banner" style={{ marginBottom: 18 }}><strong>Enquiry sent.</strong> We have received your message and sent a confirmation to your email.</div> : null}
              {params.status === "error" ? <div className="access-banner" style={{ marginBottom: 18 }}><strong>We could not send the enquiry.</strong> Please try again or email {GITDM.admissionsEmail} directly.</div> : null}
              {params.status === "missing" ? <div className="access-banner" style={{ marginBottom: 18 }}><strong>Please complete the required fields.</strong></div> : null}
              <p style={{ marginBottom: 20 }} className="muted">
                Send your enquiry directly to the GITDM institutional team. You will receive an email confirmation after successful submission.
              </p>
              <form className="form-grid" action={submitEnquiry}>
                <div className="form-row">
                  <label htmlFor="name">Full name</label>
                  <input id="name" name="name" required placeholder="Your name" />
                </div>
                <div className="form-row">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="form-row">
                  <label htmlFor="topic">Topic</label>
                  <select id="topic" name="subject" defaultValue="Admissions enquiry">
                    <option>Admissions enquiry</option>
                    <option>Programme information</option>
                    <option>Partnership</option>
                    <option>Support</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-row">
                  <label htmlFor="body">Message</label>
                  <textarea id="body" name="body" required placeholder="How can we help?" />
                </div>
                <button type="submit" className="btn btn-primary">
                  Send enquiry
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
