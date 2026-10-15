import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { applicationStatusLabel, invoiceStatusLabel, money } from "@/lib/status";
import { isApplicationFeeSettled } from "@/lib/admissions-workflow";
import { decideApplication, waiveApplicationFee, requestAdditionalInfo } from "./actions";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed =
    roleCodes.includes("PRINCIPAL") ||
    roleCodes.includes("ADMISSIONS") ||
    roleCodes.includes("ADMISSIONS_DIRECTOR") ||
    roleCodes.includes("ADMISSIONS_COUNSELOR") ||
    roleCodes.includes("REGISTRAR");
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  if (!db) return <p className="p-8">Database unavailable.</p>;

  const app = await db.application.findUnique({
    where: { id: applicationId },
    include: {
      applicant: true,
      programme: true,
      feeInvoice: true,
      documents: { orderBy: { uploadedAt: "desc" } },
      interviews: { orderBy: { scheduledAt: "desc" } },
      decisions: {
        include: { decidedBy: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { decidedAt: "desc" },
      },
    },
  });
  if (!app) redirect("/staff/admissions");

  const feeSettled = await isApplicationFeeSettled(app.id);
  const canDecide =
    feeSettled && !["ADMITTED", "ACCEPTED", "REJECTED", "WITHDRAWN"].includes(app.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/admissions" className="text-xs text-emerald-700 hover:underline">
              ← Application queue
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              {app.legalName ||
                [app.applicant.firstName, app.applicant.lastName].filter(Boolean).join(" ") ||
                app.applicant.email}
            </h1>
            <p className="text-sm text-slate-500">{app.programme.name}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {applicationStatusLabel(app.status)}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {!feeSettled && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong>Application fee outstanding.</strong> A final admission decision cannot be
            recorded until the fee is paid or waived by an authorised officer.
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Applicant details</h2>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{app.applicant.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Phone</dt>
              <dd className="font-medium text-slate-900">{app.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Nationality</dt>
              <dd className="font-medium text-slate-900">{app.nationality || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Date of birth</dt>
              <dd className="font-medium text-slate-900">
                {app.dateOfBirth ? new Date(app.dateOfBirth).toLocaleDateString("en-GB") : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Education background</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">
                {app.educationBackground || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Motivation</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{app.motivation || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
          {app.documents.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No documents uploaded.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {app.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium text-slate-800">
                    {d.type.replaceAll("_", " ")}
                  </span>
                  <a
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 hover:underline"
                  >
                    {d.originalName || "View"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {app.feeInvoice && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Application fee</h2>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {money(app.feeInvoice.amount, app.feeInvoice.currency)} ·{" "}
              {invoiceStatusLabel(app.feeInvoice.status)}
              {app.feeInvoice.waived ? " (waived)" : ""}
            </p>
            {!feeSettled && (
              <form action={waiveApplicationFee} className="mt-4 space-y-3">
                <input type="hidden" name="applicationId" value={app.id} />
                <input
                  name="reason"
                  required
                  placeholder="Waiver reason (required)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  Record authorised waiver
                </button>
              </form>
            )}
          </section>
        )}

        {canDecide && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Admission decision</h2>
            <p className="mt-1 text-xs text-slate-500">
              Fee is settled. Recording a decision will create the enrolment record and (where
              applicable) the tuition invoice.
            </p>
            <form action={decideApplication} className="mt-4 space-y-3">
              <input type="hidden" name="applicationId" value={app.id} />
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="decision" value="ACCEPTED" required defaultChecked />
                  Admit
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="decision" value="CONDITIONAL" />
                  Conditional
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" name="decision" value="REJECTED" />
                  Reject
                </label>
              </div>
              <textarea
                name="reason"
                rows={2}
                placeholder="Decision reason / notes"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Record decision
              </button>
            </form>
          </section>
        )}

        {!["ADMITTED", "ACCEPTED", "REJECTED", "WITHDRAWN"].includes(app.status) && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Request additional information</h2>
            <form action={requestAdditionalInfo} className="mt-3 space-y-3">
              <input type="hidden" name="applicationId" value={app.id} />
              <textarea
                name="note"
                required
                rows={2}
                placeholder="What does the applicant need to provide?"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Send request
              </button>
            </form>
          </section>
        )}

        {app.decisions.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Decision history</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {app.decisions.map((d) => (
                <li key={d.id} className="flex justify-between gap-4">
                  <span>
                    <strong>{d.decision}</strong>
                    {d.reason ? ` — ${d.reason}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {new Date(d.decidedAt).toLocaleString("en-GB")} ·{" "}
                    {d.decidedBy.firstName || d.decidedBy.email}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
