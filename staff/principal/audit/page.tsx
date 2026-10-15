import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getRecentAudit } from "@/lib/principal";

export const dynamic = "force-dynamic";

export default async function PrincipalAuditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/principal/audit");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  if (!roleCodes.includes("PRINCIPAL") && !roleCodes.includes("ACADEMIC_DIRECTOR")) {
    redirect("/dashboard");
  }

  const audit = await getRecentAudit(100);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Leadership
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Audit log</h1>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/api/audit/export?days=30"
              className="text-sm text-emerald-700 hover:underline"
            >
              Export CSV (30d)
            </a>
            <Link
              href="/staff/principal"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Overview
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent activity ({audit.length} events)
            </h2>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium text-slate-800">{a.action}</span>
                  <span className="text-slate-500"> · {a.entity}</span>
                  {a.entityId ? (
                    <span className="ml-1 font-mono text-xs text-slate-400">
                      {a.entityId.slice(0, 8)}…
                    </span>
                  ) : null}
                  {a.severity && a.severity !== "INFO" ? (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                      {a.severity}
                    </span>
                  ) : null}
                </div>
                <div className="shrink-0 text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleString("en-GB")}
                  {a.user?.email ? ` · ${a.user.email}` : ""}
                </div>
              </li>
            ))}
            {audit.length === 0 && (
              <li className="px-5 py-8 text-center text-slate-400">
                No audit events recorded yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
