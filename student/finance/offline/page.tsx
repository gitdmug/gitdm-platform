import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { money } from "@/lib/status";
import { GITDM } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function OfflinePaymentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/finance/offline");

  const db = getDb();
  const invoices = db
    ? await db.invoice.findMany({
        where: {
          OR: [
            { enrollment: { userId: user.id } },
            { application: { applicantId: user.id } },
          ],
          status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
          waived: false,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <Link href="/student/finance" className="text-xs text-emerald-700 hover:underline">
          ← Finance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Offline payment</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pay by bank transfer or mobile money, then Finance will verify against your invoice
          reference.
        </p>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Payment details</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Institute</dt>
              <dd className="text-right font-medium">{GITDM.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Support</dt>
              <dd className="text-right">{GITDM.supportEmail || GITDM.admissionsEmail}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reference</dt>
              <dd className="text-right font-mono text-xs">
                Use your invoice number as the payment reference
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            After paying, keep the confirmation message. Finance matches payments using the invoice
            number. Access updates automatically once verified.
          </p>
        </section>

        {invoices.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold text-slate-900">Open invoices</h2>
            <ul className="mt-3 space-y-2">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <p className="font-mono font-medium text-slate-900">{inv.invoiceNo}</p>
                  <p className="text-slate-600">{inv.description}</p>
                  <p className="mt-1 font-semibold">
                    {money(Number(inv.amount) - Number(inv.amountPaid), inv.currency)} outstanding
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      </main>
  );
}
