import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { money } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function AcademicWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/academic");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["PRINCIPAL", "ACADEMIC_DIRECTOR", "FACULTY", "LECTURER", "CURRICULUM_DEVELOPER"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  const programmes = db
    ? await db.programme.findMany({
        include: { rules: true, periods: { where: { status: "OPEN" }, take: 1 } },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Academic
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Programmes & curriculum</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/staff/academic/programmes/new"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              New programme
            </Link>
            <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
              ← Control Centre
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <p className="mb-6 text-sm text-slate-600">
          Programmes created here become the single source of truth for public pages, applications,
          fees, and learning access rules. Publish a programme to make it visible to applicants.
        </p>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applications</th>
                <th className="px-4 py-3">Fees</th>
                <th className="px-4 py-3">Access rule</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programmes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No programmes yet. Create the first one.
                  </td>
                </tr>
              ) : (
                programmes.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.code} · {p.durationMonths} month{p.durationMonths === 1 ? "" : "s"}
                        {p.intakeLabel ? ` · ${p.intakeLabel}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : p.status === "ARCHIVED"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.applicationsOpen ? (
                        <span className="font-medium text-emerald-700">Open</span>
                      ) : (
                        <span className="text-slate-500">Closed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      App {money(p.applicationFee, p.currency)}
                      <br />
                      Tuition {money(p.tuitionFee, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {Number(p.rules?.activationPaymentPercent ?? 60)}% for learning access
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/staff/academic/programmes/${p.id}`}
                        className="text-sm font-medium text-emerald-700 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
