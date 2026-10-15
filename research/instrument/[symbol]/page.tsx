import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";
import { getCurrentUser } from "@/lib/access";
import { InstrumentAnalysisClient } from "@/components/InstrumentAnalysisClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  return {
    title: `${symbol.toUpperCase()} | Market Insights | ${GITDM.shortName}`,
    description: `Educational chart, news and AI scenario analysis for ${symbol.toUpperCase()}.`,
  };
}

export default async function InstrumentPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol: raw } = await params;
  const symbol = decodeURIComponent(raw).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
  const user = await getCurrentUser();

  return (
    <>
      <Header active="/research" />
      <main>
        <section className="page-hero">
          <div className="container">
            <div className="eyebrow">Instrument detail</div>
            <h1>{symbol}</h1>
            <p>
              Live quote context, educational chart, related headlines and AI-assisted technical,
              fundamental and sentimental scenario review. Educational use only — not investment
              advice.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              <Link className="btn btn-outline-dark btn-sm" href="/research">
                ← Insights monitor
              </Link>
              <Link className="btn btn-outline-dark btn-sm" href="/research/journal">
                Performance journal
              </Link>
              <Link className="btn btn-outline-dark btn-sm" href="/research/economic-calendar">
                Economic calendar
              </Link>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container">
            <InstrumentAnalysisClient symbol={symbol} canAnalyse={!!user} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
