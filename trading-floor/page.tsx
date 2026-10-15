import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TradingFloorBooking } from "@/components/TradingFloorBooking";
import { GITDM } from "@/lib/branding";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Trading Floor | ${GITDM.shortName}`,
  description: "Book a seat on the GITDM trading floor in Kampala. 25 seats per session.",
};

export default function TradingFloorPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header active="Trading Floor" />
      <section className="page-hero">
        <div className="container">
          <div className="eyebrow">Campus facility · Kampala</div>
          <h1>Trading Floor</h1>
          <p>
            Supervised screen time, live market context, and coaching. Sessions run Monday,
            Wednesday and Thursday, 1:00–5:00 pm. Capacity is <strong>25 seats per day</strong>.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ gap: 24, marginBottom: 32 }}>
            <div className="panel">
              <div className="eyebrow">Qualification</div>
              <h2>How to qualify</h2>
              <ul className="feature-list">
                <li>
                  <strong>Pepperstone account</strong> with at least <strong>USD 50</strong> balance
                  (subject to verification), or
                </li>
                <li>
                  <strong>Own broker</strong> — pay <strong>USD 50 per week</strong> for floor access
                </li>
              </ul>
              <p className="muted" style={{ marginTop: 12 }}>
                This form requests a seat. It does not charge you. Payment (if required) and seat
                confirmation follow after GITDM reviews availability.
              </p>
            </div>
            <div className="panel">
              <div className="eyebrow">Session rules</div>
              <h2>What to expect</h2>
              <ul className="feature-list">
                <li>25 seats — when a day is full, bookings close</li>
                <li>Monday / Wednesday / Thursday only</li>
                <li>1:00 pm – 5:00 pm local time</li>
                <li>Bring your own device and trading credentials</li>
                <li>Never share passwords with staff or other learners</li>
              </ul>
            </div>
          </div>

          <TradingFloorBooking />
        </div>
      </section>

      <section className="section alt">
        <div className="container" style={{ textAlign: "center" }}>
          <p className="muted">
            Prefer to enrol on a full programme first?{" "}
            <Link href="/admissions/apply">Apply to study</Link> ·{" "}
            <Link href="/contact">Contact the institute</Link>
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
