import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getInstitutionSnapshot, getRecentAudit } from "@/lib/principal";
import { money, humanStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function PrincipalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/principal");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  if (!roleCodes.includes("PRINCIPAL") && !roleCodes.includes("ACADEMIC_DIRECTOR")) {
    redirect("/dashboard");
  }

  const snap = await getInstitutionSnapshot();
  const audit = await getRecentAudit(20);

  const cards = [
    {
      label: "Applications under review",
      value:
        (snap.applications.UNDER_REVIEW || 0) +
        (snap.applications.FEE_PENDING || 0) +
        (snap.applications.SUBMITTED || 0),
    },
    { label: "Active enrolments", value: snap.enrollments.ACTIVE || 0 },
    { label: "Published programmes", value: snap.programmes },
    { label: "Open support tickets", value: snap.openTickets },
    { label: "Certificates issued", value: snap.certificatesIssued },
    { label: "Fees collected", value: money(snap.finance.collected) },
    { label: "Outstanding fees", value: money(snap.finance.outstanding) },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Leadership
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Institutional overview</h1>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs text-slate-500">{c.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Applications by status</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(snap.applications).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-slate-600">{humanStatus(k)}</span>
                  <span className="font-medium">{v as number}</span>
                </li>
              ))}
              {Object.keys(snap.applications).length === 0 && (
                <li className="text-slate-400">No data</li>
              )}
            </ul>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Enrolments by status</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {Object.entries(snap.enrollments).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span className="text-slate-600">{humanStatus(k)}</span>
                  <span className="font-medium">{v as number}</span>
                </li>
              ))}
              {Object.keys(snap.enrollments).length === 0 && (
                <li className="text-slate-400">No data</li>
              )}
            </ul>
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Recent audit activity</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between gap-4 py-2">
                <span>
                  <span className="font-medium text-slate-800">{a.action}</span>
                  <span className="text-slate-500"> · {a.entity}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(a.createdAt).toLocaleString("en-GB")}
                  {a.user?.email ? ` · ${a.user.email}` : ""}
                </span>
              </li>
            ))}
            {audit.length === 0 && (
              <li className="py-4 text-slate-400">No audit events yet.</li>
            )}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/staff/principal/audit" className="text-emerald-700 hover:underline">
            Audit log →
          </Link>
          <Link href="/staff/admissions" className="text-emerald-700 hover:underline">
            Admissions →
          </Link>
          <Link href="/staff/finance" className="text-emerald-700 hover:underline">
            Finance →
          </Link>
          <Link href="/staff/academic" className="text-emerald-700 hover:underline">
            Academic →
          </Link>
          <Link href="/staff/student-affairs" className="text-emerald-700 hover:underline">
            Student Affairs →
          </Link>
        </div>
      </div>
    </div>
  );
}
