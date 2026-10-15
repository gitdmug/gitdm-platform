import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, requirePermission } from "@/lib/access";
import { getDb } from "@/lib/db";
import { applicationStatusLabel, money } from "@/lib/status";
import { isApplicationFeeSettled } from "@/lib/admissions-workflow";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "FEE_PENDING", label: "Fee pending" },
  { key: "UNDER_REVIEW", label: "Under review" },
  { key: "INTERVIEW_SCHEDULED", label: "Interview" },
  { key: "ADDITIONAL_INFORMATION", label: "Info needed" },
  { key: "ADMITTED", label: "Admitted" },
  { key: "REJECTED", label: "Rejected" },
] as const;

export default async function AdmissionsWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/admissions");

  // Soft permission check — allow PRINCIPAL / ADMISSIONS family
  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed =
    roleCodes.includes("PRINCIPAL") ||
    roleCodes.includes("ADMISSIONS") ||
    roleCodes.includes("ADMISSIONS_DIRECTOR") ||
    roleCodes.includes("ADMISSIONS_COUNSELOR") ||
    roleCodes.includes("REGISTRAR");
  if (!allowed) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const statusFilter = params.status || "all";
  const q = (params.q || "").trim();

  const db = getDb();
  if (!db) {
    return (
      <div className="p-8">
        <p className="text-slate-600">Database unavailable.</p>
      </div>
    );
  }

  const where: any = {};
  if (statusFilter !== "all") {
    where.status = statusFilter;
  }
  if (q) {
    where.OR = [
      { legalName: { contains: q, mode: "insensitive" } },
      { applicant: { email: { contains: q, mode: "insensitive" } } },
      { applicant: { firstName: { contains: q, mode: "insensitive" } } },
      { applicant: { lastName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const applications = await db.application.findMany({
    where,
    include: {
      applicant: { select: { id: true, email: true, firstName: true, lastName: true } },
      programme: { select: { name: true, code: true, intakeLabel: true } },
      feeInvoice: { select: { id: true, status: true, amount: true, amountPaid: true, currency: true, waived: true } },
      documents: { select: { type: true } },
      decisions: { orderBy: { decidedAt: "desc" }, take: 1 },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  // Enrich with fee settled flag
  const rows: Array<(typeof applications)[number] & { feeSettled: boolean }> = await Promise.all(
    applications.map(async (app) => ({
      ...app,
      feeSettled: await isApplicationFeeSettled(app.id),
    }))
  );

  const counts = await db.application.groupBy({
    by: ["status"],
    _count: true,
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Staff · Admissions</p>
            <h1 className="text-xl font-semibold text-slate-900">Application queue</h1>
          </div>
          <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const count = f.key === "all" ? applications.length : countMap[f.key] || 0;
            const active = statusFilter === f.key;
            return (
              <Link
                key={f.key}
                href={`/staff/admissions${f.key === "all" ? "" : `?status=${f.key}`}`}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
                {f.key !== "all" && count > 0 ? ` (${count})` : ""}
              </Link>
            );
          })}
        </div>

        {/* Search */}
        <form className="mb-6" method="get">
          {statusFilter !== "all" && <input type="hidden" name="status" value={statusFilter} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or email…"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </form>

        {/* Queue table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No applications match this filter.
                  </td>
                </tr>
              ) : (
                rows.map((app) => {
                  const name =
                    app.legalName ||
                    [app.applicant.firstName, app.applicant.lastName].filter(Boolean).join(" ") ||
                    app.applicant.email;
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{app.applicant.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-900">{app.programme.name}</p>
                        <p className="text-xs text-slate-500">{app.programme.intakeLabel || app.programme.code}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {applicationStatusLabel(app.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {app.feeInvoice ? (
                          <span
                            className={`text-xs font-medium ${
                              app.feeSettled ? "text-emerald-700" : "text-amber-700"
                            }`}
                          >
                            {app.feeSettled ? "Settled" : money(app.feeInvoice.amount, app.feeInvoice.currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{app.documents.length}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {app.submittedAt
                          ? new Date(app.submittedAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/staff/admissions/${app.id}`}
                          className="text-sm font-medium text-emerald-700 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Final admission decisions are blocked until the application fee is paid or an authorised waiver is recorded.
        </p>
      </div>
    </div>
  );
}
