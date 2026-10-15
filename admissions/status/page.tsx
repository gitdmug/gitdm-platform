import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { applicationStatusLabel, money } from "@/lib/status";
import { isApplicationFeeSettled } from "@/lib/admissions-workflow";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ApplicationStatusPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/admissions/status");

  const db = getDb();
  if (!db) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-600">
          Service temporarily unavailable.
        </div>
        <Footer />
      </main>
    );
  }

  const applications = await db.application.findMany({
    where: { applicantId: user.id },
    include: {
      programme: { select: { name: true, code: true } },
      feeInvoice: true,
      documents: { select: { type: true } },
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-emerald-700">Admissions</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Application status</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track fee payment, document checks, and decisions for every application on your account.
        </p>

        {applications.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-slate-600">You have not started an application yet.</p>
            <Link
              href="/admissions/apply"
              className="mt-4 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
            >
              Start application
            </Link>
          </div>
        ) : (
          <ul className="mt-8 space-y-6">
            {await Promise.all(
              applications.map(async (app) => {
                const feeOk = await isApplicationFeeSettled(app.id);
                const hasId = app.documents.some((d) =>
                  (["IDENTITY", "PASSPORT", "DRIVERS_LICENCE", "VOTER_SLIP"] as string[]).includes(
                    d.type
                  )
                );
                const hasPhoto = app.documents.some((d) =>
                  (["PASSPORT_PHOTO", "OTHER"] as string[]).includes(d.type)
                );
                const steps = [
                  {
                    label: "Submitted",
                    done: Boolean(app.submittedAt) || app.status !== "DRAFT",
                  },
                  { label: "Documents", done: hasId && hasPhoto },
                  { label: "Application fee", done: feeOk },
                  {
                    label: "Under review",
                    done: [
                      "UNDER_REVIEW",
                      "ADMITTED",
                      "ACCEPTED",
                      "REJECTED",
                      "CONDITIONAL",
                    ].includes(app.status),
                  },
                  {
                    label: "Decision",
                    done: ["ADMITTED", "ACCEPTED", "REJECTED", "CONDITIONAL"].includes(
                      app.status
                    ),
                  },
                ];

                return (
                  <li
                    key={app.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-slate-900">{app.programme.name}</h2>
                        <p className="text-xs text-slate-500">{app.programme.code}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {applicationStatusLabel(app.status)}
                      </span>
                    </div>

                    <ol className="mt-5 flex flex-wrap gap-2">
                      {steps.map((s) => (
                        <li
                          key={s.label}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            s.done
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {s.done ? "✓ " : ""}
                          {s.label}
                        </li>
                      ))}
                    </ol>

                    {app.feeInvoice && (
                      <p className="mt-4 text-sm text-slate-600">
                        Fee:{" "}
                        {feeOk
                          ? "Settled"
                          : money(app.feeInvoice.amount, app.feeInvoice.currency)}
                      </p>
                    )}

                    {app.decisions[0] && (
                      <p className="mt-2 text-sm text-slate-600">
                        Decision: {app.decisions[0].decision}
                        {app.decisions[0].decidedAt
                          ? ` · ${new Date(app.decisions[0].decidedAt).toLocaleDateString("en-GB")}`
                          : ""}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Link
                        href={`/admissions/apply/${app.id}`}
                        className="text-sm text-emerald-700 hover:underline"
                      >
                        Open application
                      </Link>
                      <Link href="/applicant" className="text-sm text-slate-600 hover:underline">
                        Applicant portal
                      </Link>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
      <Footer />
    </main>
  );
}
