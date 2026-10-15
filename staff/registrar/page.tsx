import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { listStudents, updateEnrollmentStatus, activateStudent } from "@/lib/registrar";
import { linkParentToStudent } from "@/lib/parent";
import { enrollmentStatusLabel } from "@/lib/status";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function statusAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await updateEnrollmentStatus({
    enrollmentId: String(formData.get("enrollmentId") || ""),
    status: String(formData.get("status") || "") as any,
    reason: String(formData.get("reason") || "Registrar update"),
    actorId: user.id,
  });
  redirect("/staff/registrar?updated=1");
}


async function linkParentAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const parentEmail = String(formData.get("parentEmail") || "").trim().toLowerCase();
  const studentId = String(formData.get("studentId") || "");
  const relationship = String(formData.get("relationship") || "Guardian");
  const db = getDb();
  if (!db) throw new Error("DB unavailable");
  const parent = await db.user.findFirst({ where: { email: parentEmail } });
  if (!parent) throw new Error("Parent account not found — they must register first.");
  await linkParentToStudent({
    parentId: parent.id,
    studentId,
    relationship,
    actorId: user.id,
  });
  redirect("/staff/registrar?linked=1");
}

async function activateAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await activateStudent({
    enrollmentId: String(formData.get("enrollmentId") || ""),
    actorId: user.id,
  });
  redirect("/staff/registrar?activated=1");
}

export default async function RegistrarPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/registrar");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["REGISTRAR", "PRINCIPAL", "ACADEMIC_DIRECTOR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const sp = await searchParams;
  const students = await listStudents({ status: sp.status, q: sp.q });
  const db = getDb();
  const programmes = db
    ? await db.programme.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Registrar
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Student records</h1>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <form className="mb-6 flex flex-wrap gap-2" method="get">
          <input
            name="q"
            defaultValue={sp.q || ""}
            placeholder="Search name or email…"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={sp.status || ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {["PENDING", "ACTIVE", "SUSPENDED", "WITHDRAWN", "COMPLETED", "REPEATING"].map(
              (s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              )
            )}
          </select>
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Filter
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Programme</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Access</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    No records match.
                  </td>
                </tr>
              ) : (
                students.map((en) => {
                  const name =
                    [en.user.firstName, en.user.lastName].filter(Boolean).join(" ") ||
                    en.user.email;
                  return (
                    <tr key={en.id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">{en.user.email}</p>
                        <p className="font-mono text-[10px] text-slate-400">{en.user.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{en.programme.name}</p>
                        <p className="text-xs text-slate-500">{en.period?.name || "—"}</p>
                        {en.studentNumber && (
                          <p className="font-mono text-[10px] text-slate-400">{en.studentNumber}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium">
                          {enrollmentStatusLabel(en.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{en.accessLevel}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {en.status === "PENDING" && (
                            <form action={activateAction}>
                              <input type="hidden" name="enrollmentId" value={en.id} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-emerald-700 hover:underline"
                              >
                                Activate
                              </button>
                            </form>
                          )}
                          <form action={statusAction} className="flex flex-wrap gap-1">
                            <input type="hidden" name="enrollmentId" value={en.id} />
                            <select
                              name="status"
                              className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                              defaultValue={en.status}
                            >
                              {["PENDING", "ACTIVE", "SUSPENDED", "WITHDRAWN", "COMPLETED", "REPEATING"].map(
                                (s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                )
                              )}
                            </select>
                            <input
                              name="reason"
                              required
                              placeholder="Reason"
                              className="w-28 rounded border border-slate-200 px-1 py-0.5 text-xs"
                            />
                            <button type="submit" className="text-xs text-slate-700 hover:underline">
                              Update
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Link parent / guardian</h2>
          <p className="mt-1 text-xs text-slate-500">
            Parent must already have a GITDM account. They will see progress on /parent.
          </p>
          <form action={linkParentAction} className="mt-3 flex flex-wrap gap-2">
            <input name="parentEmail" type="email" required placeholder="Parent email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="studentId" required placeholder="Student user ID" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="relationship" placeholder="Mother / Father / Guardian" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white">Link</button>
          </form>
        </section>

        <p className="mt-4 text-xs text-slate-500">
          Status changes are audited with reason. Registrar does not alter marks or payment
          records.
        </p>
      </div>
    </div>
  );
}
