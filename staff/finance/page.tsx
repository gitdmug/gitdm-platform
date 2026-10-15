import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { invoiceStatusLabel, money } from "@/lib/status";
import { verifyOfflinePaymentAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function FinanceWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/finance");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["PRINCIPAL", "FINANCE", "BURSAR_BILLING_SPECIALIST"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const params = await searchParams;
  const statusFilter = params.status || "unpaid";

  const db = getDb();
  if (!db) return <p className="p-8">Database unavailable.</p>;

  const where: any =
    statusFilter === "unpaid"
      ? { status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }
      : statusFilter === "all"
      ? {}
      : { status: statusFilter };

  const invoices = await db.invoice.findMany({
    where,
    include: {
      enrollment: {
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          programme: { select: { name: true } },
        },
      },
      application: {
        include: {
          applicant: { select: { id: true, email: true, firstName: true, lastName: true } },
          programme: { select: { name: true } },
        },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 3 },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  const totals = {
    outstanding: invoices
      .filter((i) => i.status !== "PAID" && !i.waived)
      .reduce((s, i) => s + (Number(i.amount) - Number(i.amountPaid)), 0),
    collected: invoices.reduce((s, i) => s + Number(i.amountPaid), 0),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Staff · Finance</p>
            <h1 className="text-xl font-semibold text-slate-900">Invoices & payments</h1>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Outstanding (this view)</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{money(totals.outstanding)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Collected (this view)</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">{money(totals.collected)}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "unpaid", label: "Unpaid" },
            { key: "PAID", label: "Paid" },
            { key: "all", label: "All" },
          ].map((f) => (
            <Link
              key={f.key}
              href={`/staff/finance${f.key === "unpaid" ? "" : `?status=${f.key}`}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                statusFilter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Student / Applicant</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Verify offline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No invoices match this filter.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const person =
                    inv.enrollment?.user ||
                    inv.application?.applicant ||
                    null;
                  const programmeName =
                    inv.enrollment?.programme?.name ||
                    inv.application?.programme?.name ||
                    "—";
                  const name = person
                    ? [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email
                    : "—";
                  const outstanding = Number(inv.amount) - Number(inv.amountPaid);
                  const canVerify =
                    !inv.waived && inv.status !== "PAID" && person && outstanding > 0;

                  return (
                    <tr key={inv.id} className="align-top hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{inv.invoiceNo}</p>
                        <p className="text-xs text-slate-500">{inv.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{programmeName}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">{inv.kind.replaceAll("_", " ")}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{money(inv.amount, inv.currency)}</p>
                        <p className="text-xs text-slate-500">
                          Paid {money(inv.amountPaid, inv.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium">{invoiceStatusLabel(inv.status)}</span>
                        {inv.waived && (
                          <span className="ml-1 text-xs text-amber-700">(waived)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {canVerify ? (
                          <form action={verifyOfflinePaymentAction} className="space-y-1">
                            <input type="hidden" name="invoiceId" value={inv.id} />
                            <input type="hidden" name="userId" value={person!.id} />
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              min="1"
                              max={outstanding}
                              defaultValue={outstanding}
                              required
                              className="w-28 rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                            <input
                              name="reference"
                              required
                              placeholder="Bank / MM ref"
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            />
                            <button
                              type="submit"
                              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-800"
                            >
                              Verify
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Offline payments are only settled after Finance verification. Student screenshots never
          auto-confirm a payment. Access levels update automatically after a verified payment.
        </p>
      </div>
    </div>
  );
}
