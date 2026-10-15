import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { money } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const payment = await db.payment.findFirst({
    where: { id: paymentId, userId: user.id, status: "COMPLETED" },
    include: {
      invoice: true,
      receipt: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
  if (!payment) notFound();

  const name =
    [payment.user.firstName, payment.user.lastName].filter(Boolean).join(" ") ||
    payment.user.email;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 print:bg-white">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:shadow-none print:border-0">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Global Institute of Trading and Derivatives Markets
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Official receipt</h1>
          <p className="mt-1 font-mono text-sm text-slate-500">
            {payment.receipt?.receiptNo || payment.id}
          </p>

          <dl className="mt-8 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Received from</dt>
              <dd className="font-medium text-slate-900">{name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-semibold text-slate-900">
                {money(payment.amount, payment.currency)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">For</dt>
              <dd className="text-right font-medium text-slate-900">
                {payment.invoice.description}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Invoice</dt>
              <dd className="font-mono text-slate-700">{payment.invoice.invoiceNo}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Method</dt>
              <dd className="text-slate-900">
                {payment.provider}
                {payment.providerMethod ? ` · ${payment.providerMethod}` : ""}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Date</dt>
              <dd className="text-slate-900">
                {payment.verifiedAt
                  ? new Date(payment.verifiedAt).toLocaleString("en-GB")
                  : new Date(payment.createdAt).toLocaleString("en-GB")}
              </dd>
            </div>
          </dl>

          <p className="mt-8 text-xs text-slate-500">
            This receipt confirms payment recorded on the GITDM student finance system.
          </p>
        </div>

        <div className="mt-6 flex justify-center gap-4 print:hidden">
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
          >
            <a href="javascript:window.print()">Print</a>
          </button>
          <Link href="/student/finance" className="text-sm text-emerald-700 hover:underline">
            ← Finance
          </Link>
        </div>
      </div>
      </main>
  );
}
