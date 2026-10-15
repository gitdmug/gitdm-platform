import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GITDM } from "@/lib/branding";

export const metadata = {
  title: `Market Basics | ${GITDM.shortName}`,
};

export default function FreeMarketBasicsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <Header active="Store" />
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Link href="/store" className="text-sm text-emerald-700 hover:underline">
          ← Store
        </Link>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Market Basics</h1>
        <p className="mt-2 text-slate-600">Free GITDM introductory guide for new learners.</p>
        <article className="prose mt-8 max-w-none rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2>What markets do</h2>
          <p>
            Financial markets bring together buyers and sellers of instruments such as currencies,
            commodities, indices and shares. Prices move as information and risk appetite change.
          </p>
          <h2>Risk first</h2>
          <p>
            Every trade involves the possibility of loss. Position size, stop levels and a written
            plan matter more than prediction. GITDM teaches process — not guaranteed returns.
          </p>
          <h2>Next steps</h2>
          <ul>
            <li>Explore published programmes on the catalogue</li>
            <li>Apply when an intake is open</li>
            <li>Use Research for educational market context</li>
          </ul>
          <p>
            <Link href="/programmes">View programmes</Link> ·{" "}
            <Link href="/admissions/apply">Apply</Link> ·{" "}
            <Link href="/research">Research</Link>
          </p>
        </article>
      </div>
      <Footer />
    </main>
  );
}
