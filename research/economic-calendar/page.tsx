import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { EconomicCalendarClient } from "@/components/EconomicCalendarClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Economic Calendar | ${GITDM.shortName}`,
  description: "Upcoming economic events for educational market context and optional AI scenario analysis.",
};

export default function EconomicCalendarPage() {
  return (
    <>
      <Header active="/research" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Market intelligence</div>
            <h1>Economic calendar</h1>
            <p>
              Planned high-impact releases and policy events. Use them as context for scenario analysis —
              never as trading signals on their own.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <EconomicCalendarClient />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
