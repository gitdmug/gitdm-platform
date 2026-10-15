import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { PerformanceJournalClient } from "@/components/PerformanceJournalClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Analysis Journal | ${GITDM.shortName}`,
  description: "Institutional market analysis performance tracker — personal history and public verified outcomes.",
};

export default function ResearchJournalPage() {
  return (
    <>
      <Header active="/research" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Market intelligence</div>
            <h1>Analysis performance journal</h1>
            <p>
              Every signed-in analysis is recorded. Verified outcomes contribute to the public institutional
              track record. Educational use only — not investment advice.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <PerformanceJournalClient />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
