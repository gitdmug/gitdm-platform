import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { applicationStatusLabel, invoiceStatusLabel, money } from "@/lib/status";
import { isApplicationFeeSettled } from "@/lib/admissions-workflow";
import { Header } from "@/components/Header";
import { payApplicationFeeOnline } from "./actions";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ApplicantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; paid?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/applicant");

  const db = getDb();
  if (!db) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-slate-600">Service temporarily unavailable. Please try again shortly.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const applications = await db.application.findMany({
    where: { applicantId: user.id },
    include: {
      programme: { select: { id: true, name: true, code: true, durationMonths: true, intakeLabel: true, nextStartDate: true } },
      feeInvoice: true,
      documents: { select: { id: true, type: true, originalName: true } },
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const latest = applications[0] || null;
  let feeSettled = false;
  if (latest) {
    feeSettled = await isApplicationFeeSettled(latest.id);
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {(sp.error || sp.paid) && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            sp.paid ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"
          }`}>
            {sp.paid && "Payment received. Admissions can now proceed with review."}
            {sp.error && sp.error}
          </div>
        )}
        <div className="mb-8">
          <p className="text-sm font-medium text-emerald-700">Applicant portal</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Welcome{user.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-2 text-slate-600">
            Track your application, pay the application fee, and upload required documents.
          </p>
          <p className="mt-2">
            <a href="/admissions/status" className="text-sm text-emerald-700 hover:underline">
              Full status tracker →
            </a>
          </p>
        </div>

        {!latest ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Start your application</h2>
            <p className="mt-2 text-slate-600">
              Choose an open programme to begin. You will need a valid identification document and a passport-style photograph.
            </p>
            <Link
              href="/admissions/apply"
              className="mt-6 inline-flex items-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              View open programmes
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current application</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-900">{latest.programme.name}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {latest.programme.intakeLabel || "Current intake"}
                    {latest.programme.nextStartDate
                      ? ` · starts ${new Date(latest.programme.nextStartDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    latest.status === "ADMITTED" || latest.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-800"
                      : latest.status === "REJECTED"
                      ? "bg-red-100 text-red-800"
                      : latest.status === "FEE_PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {applicationStatusLabel(latest.status)}
                </span>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-slate-500">Application fee</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-900">
                    {latest.feeInvoice
                      ? feeSettled
                        ? "Paid / waived"
                        : money(latest.feeInvoice.amount, latest.feeInvoice.currency)
                      : "Not required"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Documents</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-900">
                    {latest.documents.length} uploaded
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Submitted</dt>
                  <dd className="mt-0.5 text-sm font-medium text-slate-900">
                    {latest.submittedAt
                      ? new Date(latest.submittedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not yet submitted"}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/admissions/apply/${latest.id}`}
                  className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  Continue application
                </Link>
                {latest.status === "FEE_PENDING" && latest.feeInvoice && (
                  <form action={payApplicationFeeOnline}>
                    <input type="hidden" name="invoiceId" value={latest.feeInvoice.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                    >
                      Pay application fee online
                    </button>
                  </form>
                )}
              </div>
            </section>

            {/* Fee detail */}
            {latest.feeInvoice && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Application fee invoice</h3>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-slate-900">
                      {money(latest.feeInvoice.amount, latest.feeInvoice.currency)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Invoice {latest.feeInvoice.invoiceNo} · {invoiceStatusLabel(latest.feeInvoice.status)}
                      {latest.feeInvoice.waived ? " (waived)" : ""}
                    </p>
                  </div>
                  {!feeSettled && (
                    <Link
                      href={`/admissions/apply/${latest.id}#payment`}
                      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Pay now
                    </Link>
                  )}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Admissions cannot issue a final decision until this fee is paid or an authorised waiver is recorded.
                </p>
              </section>
            )}

            {/* History */}
            {applications.length > 1 && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900">Other applications</h3>
                <ul className="mt-4 divide-y divide-slate-100">
                  {applications.slice(1).map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{a.programme.name}</p>
                        <p className="text-xs text-slate-500">{applicationStatusLabel(a.status)}</p>
                      </div>
                      <Link href={`/admissions/apply/${a.id}`} className="text-sm text-emerald-700 hover:underline">
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
