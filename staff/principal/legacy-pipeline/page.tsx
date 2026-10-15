import Link from "next/link";
import { redirect } from "next/navigation";
import {
  countOperationalGaps,
  reportLegacyPipeline,
  requireStaffForBridge,
} from "@/lib/legacy-bridge";

export const dynamic = "force-dynamic";

export default async function LegacyPipelinePage() {
  const staff = await requireStaffForBridge();
  if (!staff) redirect("/auth/sign-in?returnTo=/staff/principal/legacy-pipeline");

  const [pipeline, gaps] = await Promise.all([
    reportLegacyPipeline(200),
    countOperationalGaps(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Shared database bridge</p>
            <h1 className="text-2xl font-semibold text-slate-900">Legacy admissions &amp; paid students</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Old and new platforms use the same Neon Postgres schema. Students keep their
              Application / Enrollment / Invoice rows. On first sign-in with the same email,
              <code className="mx-1 rounded bg-slate-100 px-1">authUserId</code>
              is re-linked automatically — no dual tables required.
            </p>
          </div>
          <Link href="/staff/principal" className="text-sm text-slate-600 hover:underline">
            ← Principal
          </Link>
        </div>

        {gaps.databaseConfigured && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Users", gaps.users],
              ["Open apps", gaps.applicationsOpen],
              ["Active enrolments", gaps.enrollmentsActive],
              ["Unpaid invoices", gaps.invoicesUnpaid],
              ["Programmes", gaps.programmes],
              ["Roles", gaps.roles],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Applicant</th>
                <th className="px-3 py-2">Programme</th>
                <th className="px-3 py-2">App status</th>
                <th className="px-3 py-2">Enrolment</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Auth link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pipeline.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No open pipeline applications found in the shared database.
                  </td>
                </tr>
              ) : (
                pipeline.map((row) => (
                  <tr key={row.applicationId}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{row.applicantName}</div>
                      <div className="text-xs text-slate-500">{row.applicantEmail}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.programmeName}</td>
                    <td className="px-3 py-2">{row.status}</td>
                    <td className="px-3 py-2">{row.enrollmentStatus || "—"}</td>
                    <td className="px-3 py-2">
                      {row.invoiceStatus || "—"}
                      {row.paidAmount > 0 ? ` · paid ${row.paidAmount}` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {row.hasAuthLink ? (
                        <span className="text-emerald-700">Linked</span>
                      ) : (
                        <span className="text-amber-700">Needs sign-in</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
