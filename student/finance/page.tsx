import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { invoiceStatusLabel, money } from "@/lib/status";
import {
  computeClearance,
  clearanceStatusLabel,
} from "@/lib/finance-clearance";
import { payInvoiceOnline } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentFinancePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; error?: string; pending?: string; cancelled?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/finance");

  const db = getDb();
  if (!db) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">
          Service temporarily unavailable.
        </div>
        </main>
    );
  }

  const enrollment = await db.enrollment.findFirst({
    where: { userId: user.id, status: { in: ["PENDING", "ACTIVE", "REPEATING", "SUSPENDED"] } },
    include: {
      programme: true,
      invoices: {
        where: { status: { not: "VOID" } },
        include: { payments: true, receipts: true },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Also surface application-fee invoices not tied to enrolment
  const appFeeInvoices = await db.invoice.findMany({
    where: {
      kind: "APPLICATION_FEE",
      application: { applicantId: user.id },
      status: { not: "VOID" },
    },
    include: { payments: true, receipts: true },
    orderBy: { createdAt: "desc" },
  });

  const clearance = enrollment ? await computeClearance(enrollment.id) : null;

  const allInvoices = [
    ...(enrollment?.invoices || []),
    ...appFeeInvoices.filter((a) => !(enrollment?.invoices || []).some((e) => e.id === a.id)),
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {(sp.paid || sp.error || sp.pending || sp.cancelled) && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            sp.paid ? "border-emerald-200 bg-emerald-50 text-emerald-900" :
            sp.error ? "border-red-200 bg-red-50 text-red-900" :
            "border-amber-200 bg-amber-50 text-amber-900"
          }`}>
            {sp.paid && "Payment confirmed. Your balance and access will update shortly."}
            {sp.pending && "Payment is still processing. Refresh in a moment."}
            {sp.cancelled && "Payment was cancelled. You can try again or use offline payment."}
            {sp.error && sp.error}
          </div>
        )}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">Student portal</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Finance</h1>
            <p className="mt-1 text-sm text-slate-600">
              Invoices, payments, receipts and clearance status.
            </p>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal home
          </Link>
        </div>

        {clearance && (
          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Financial clearance</h2>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {clearanceStatusLabel(clearance.status)}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Invoiced</dt>
                <dd className="font-medium">{money(clearance.totalInvoiced, clearance.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Paid</dt>
                <dd className="font-medium">{money(clearance.totalPaid, clearance.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Outstanding</dt>
                <dd className="font-medium">{money(clearance.totalOutstanding, clearance.currency)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">% paid</dt>
                <dd className="font-medium">{clearance.percentPaid}%</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-slate-500">
              Learning access requires at least {clearance.activationPercentRequired}% of tuition
              paid. Full exam clearance requires {clearance.examPercentRequired}%. Current access
              level: <strong>{clearance.accessLevel}</strong>.
            </p>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Invoices</h2>
          </div>
          {allInvoices.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {allInvoices.map((inv) => (
                <li key={inv.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{inv.description}</p>
                      <p className="text-xs text-slate-500">
                        {inv.invoiceNo} · {inv.kind.replaceAll("_", " ")} ·{" "}
                        {invoiceStatusLabel(inv.status)}
                        {inv.waived ? " (waived)" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {money(inv.amount, inv.currency)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Paid {money(inv.amountPaid, inv.currency)}
                      </p>
                    </div>
                  </div>
                  {inv.receipts && inv.receipts.length > 0 && (() => {
                    const completed = inv.payments?.find((pay: any) => pay.status === "COMPLETED");
                    return (
                    <p className="mt-2 text-xs text-emerald-700">
                      Receipt {inv.receipts[0].receiptNo}
                      {completed?.id && (
                        <>
                          {" · "}
                          <Link
                            href={`/student/receipts/${completed.id}`}
                            className="underline"
                          >
                            View
                          </Link>
                        </>
                      )}
                    </p>
                    );
                  })()}
                  {!inv.waived && inv.status !== "PAID" && Number(inv.amount) > Number(inv.amountPaid) && (
                    <form action={payInvoiceOnline} className="mt-3">
                      <input type="hidden" name="invoiceId" value={inv.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                      >
                        Pay online (Pesapal)
                      </button>
                    </form>
                  )}
                  {!inv.waived && inv.status !== "PAID" && (
                    <Link
                      href="/student/finance/offline"
                      className="mt-2 inline-block text-xs text-slate-600 hover:underline"
                    >
                      Offline payment instructions
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-6 text-xs text-slate-500">
          Online payment via Pesapal will be offered where configured. For bank transfer or mobile
          money, pay using the invoice number as reference and Finance will verify the payment.
          Screenshots alone do not settle an invoice.
        </p>
      </div>
      </main>
  );
}
