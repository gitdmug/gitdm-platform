import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { PerformanceFullReportClient } from "@/components/PerformanceFullReportClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: `Full performance report | ${GITDM.shortName}`,
  description: "Complete analysis journal with export.",
};

export default function FullJournalPage() {
  return (
    <>
      <Header active="/research" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Market intelligence</div>
            <h1>Full performance report</h1>
            <p>
              Complete personal history for the selected period. Export as CSV for offline review.
              Educational use only.
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <PerformanceFullReportClient />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
