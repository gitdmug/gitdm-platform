import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import {
  listLinkedStudents,
  getStudentSnapshotForParent,
} from "@/lib/parent";
import { money } from "@/lib/status";
import { clearanceStatusLabel } from "@/lib/finance-clearance";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function ParentPortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/parent");

  const links = await listLinkedStudents(user.id);

  const snapshots = [];
  for (const link of links) {
    const snap = await getStudentSnapshotForParent(link.studentId);
    snapshots.push({ link, snap });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-emerald-700">Parent / Guardian</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Welcome{user.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Progress and finance summary for linked students. Contact the Registrar to add or
          change a link.
        </p>

        {snapshots.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No students are linked to this account yet. Ask GITDM Registrar to connect your
            account to the student record.
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {snapshots.map(({ link, snap }) => {
              const name =
                [link.student.firstName, link.student.lastName].filter(Boolean).join(" ") ||
                link.student.email;
              return (
                <section
                  key={link.studentId}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
                      <p className="text-xs text-slate-500">
                        {link.relationship || "Guardian"}
                        {link.isPrimary ? " · Primary" : ""}
                      </p>
                    </div>
                    {snap?.enrollment && (
                      <p className="text-sm text-slate-600">
                        {snap.enrollment.programme.name}
                        <span className="ml-2 text-xs text-slate-400">
                          {snap.enrollment.status}
                        </span>
                      </p>
                    )}
                  </div>

                  {snap?.clearance && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Clearance</p>
                        <p className="font-medium text-slate-900">
                          {clearanceStatusLabel(snap.clearance.status)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Paid</p>
                        <p className="font-medium text-slate-900">
                          {snap.clearance.percentPaid}%
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Outstanding</p>
                        <p className="font-medium text-slate-900">
                          {money(snap.clearance.totalOutstanding)}
                        </p>
                      </div>
                    </div>
                  )}

                  {snap?.grades && snap.grades.length > 0 && (
                    <ul className="mt-4 divide-y divide-slate-100 text-sm">
                      {snap.grades.map((g: any, i: number) => (
                        <li key={i} className="flex justify-between py-2">
                          <span className="text-slate-700">{g.courseTitle}</span>
                          <span
                            className={
                              g.passed
                                ? "font-medium text-emerald-700"
                                : g.total == null
                                ? "text-slate-400"
                                : "font-medium text-red-700"
                            }
                          >
                            {g.total != null ? `${g.total}%` : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {!snap?.enrollment && (
                    <p className="mt-4 text-sm text-slate-500">No active enrolment found.</p>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-sm">
          <Link href="/dashboard" className="text-emerald-700 hover:underline">
            ← Dashboard
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
