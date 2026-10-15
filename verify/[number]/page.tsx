import Link from "next/link";
import { verifyCertificatePublic } from "@/lib/certificates";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const result = await verifyCertificatePublic(decodeURIComponent(number));

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p className="text-sm font-medium text-emerald-700">Certificate verification</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Public authenticity check</h1>

        {!result ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="font-semibold text-red-900">Not verified</p>
            <p className="mt-2 text-sm text-red-800">
              No valid issued certificate was found for this number. It may be incorrect, revoked, or
              not yet issued.
            </p>
            <p className="mt-3 font-mono text-xs text-red-700">{number}</p>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Valid</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Certificate number</dt>
                <dd className="font-mono font-medium text-slate-900">{result.number}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Holder</dt>
                <dd className="font-medium text-slate-900">{result.holderName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Programme / award</dt>
                <dd className="font-medium text-slate-900">{result.programme}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Issued</dt>
                <dd className="font-medium text-slate-900">
                  {result.issuedAt
                    ? new Date(result.issuedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-slate-500">
              This page discloses only the minimum information needed to confirm authenticity.
              Global Institute of Trading and Derivatives Markets Ltd.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-sm">
          <Link href="/" className="text-emerald-700 hover:underline">
            Return to GITDM
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
