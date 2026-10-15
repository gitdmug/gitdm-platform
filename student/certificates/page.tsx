import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { evaluateCertificateEligibility } from "@/lib/certificates";

export const dynamic = "force-dynamic";

export default async function StudentCertificatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/certificates");

  const db = getDb();
  if (!db) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-slate-600">Certificates are temporarily unavailable.</p>
        <Link href="/student" className="mt-4 inline-block text-emerald-700 hover:underline">
          ← Portal
        </Link>
      </main>
    );
  }

  let enrollment = null;
  let certificates: any[] = [];
  let transcripts: any[] = [];
  let eligibility = null;
  let loadError: string | null = null;

  try {
    enrollment = await db.enrollment.findFirst({
      where: { userId: user.id, status: { in: ["ACTIVE", "COMPLETED", "PENDING"] } },
      include: { programme: true },
      orderBy: { createdAt: "desc" },
    });

    certificates = await db.certificate.findMany({
      where: { userId: user.id },
      include: { programme: true },
      orderBy: { issuedAt: "desc" },
    });

    transcripts = await db.transcript.findMany({
      where: { userId: user.id },
      include: { programme: true, entries: true },
      orderBy: { generatedAt: "desc" },
    });

    if (enrollment) {
      try {
        eligibility = await evaluateCertificateEligibility(user.id, enrollment.programmeId);
      } catch {
        eligibility = null;
      }
    }
  } catch (error) {
    console.error("[GITDM certificates] load failed:", error);
    loadError =
      "Certificate records could not be loaded. This is usually a missing database table after deploy — run prisma db push, then try again.";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Official records</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Certificates & transcripts</h1>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {loadError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            {loadError}
          </div>
        )}

        {eligibility && enrollment && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Eligibility — {enrollment.programme.name}
            </h2>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                Academic completion:{" "}
                <strong className={eligibility.academicallyComplete ? "text-emerald-700" : "text-amber-700"}>
                  {eligibility.academicallyComplete ? "Yes" : "Not yet"}
                </strong>
              </li>
              <li>
                Financial clearance:{" "}
                <strong className={eligibility.financiallyCleared ? "text-emerald-700" : "text-amber-700"}>
                  {eligibility.financiallyCleared ? "Yes" : "Outstanding fees"}
                </strong>
              </li>
              <li>
                Eligible to request certificate:{" "}
                <strong className={eligibility.eligible ? "text-emerald-700" : "text-slate-600"}>
                  {eligibility.eligible ? "Yes" : "No"}
                </strong>
              </li>
            </ul>
          </section>
        )}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Certificates</h2>
          {certificates.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No certificates issued yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {certificates.map((c) => (
                <li key={c.id} className="flex justify-between py-2">
                  <span className="font-medium text-slate-800">
                    {c.programme?.name || "Programme"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("en-GB") : c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Transcripts</h2>
          {transcripts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No transcripts generated yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {transcripts.map((t) => (
                <li key={t.id} className="flex justify-between py-2">
                  <span className="font-medium text-slate-800">
                    {t.programme?.name || "Programme"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.generatedAt
                      ? new Date(t.generatedAt).toLocaleDateString("en-GB")
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
