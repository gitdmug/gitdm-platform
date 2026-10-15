import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { createStaffInvitation, listPendingInvitations } from "@/lib/staff-invite";

export const dynamic = "force-dynamic";

async function inviteAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await createStaffInvitation({
    email: String(formData.get("email") || ""),
    roleCode: String(formData.get("roleCode") || "LECTURER"),
    departmentId: String(formData.get("departmentId") || ""),
    invitedById: user.id,
  });
  redirect("/staff/hr?invited=1");
}

const ROLE_OPTIONS = [
  "LECTURER",
  "FACULTY",
  "ADMISSIONS",
  "FINANCE",
  "REGISTRAR",
  "EXAM_OFFICER",
  "STUDENT_AFFAIRS",
  "LIBRARY",
  "MARKETING",
  "IT",
  "ACADEMIC_DIRECTOR",
];

export default async function HRPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/hr");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["PRINCIPAL", "REGISTRAR", "IT", "CTO_IT_DIRECTOR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  const departments = db
    ? await db.department.findMany({ orderBy: { name: "asc" } })
    : [];
  const pending = await listPendingInvitations();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · HR
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Staff invitations</h1>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <form action={inviteAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Invite staff member</h2>
          <input
            name="email"
            type="email"
            required
            placeholder="Email address"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="roleCode" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <select name="departmentId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {departments.length === 0 && (
                <option value="">No departments — seed first</option>
              )}
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
            disabled={departments.length === 0}
          >
            Send invitation
          </button>
        </form>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Pending invitations</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {pending.map((inv) => (
              <li key={inv.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{inv.email}</p>
                  <p className="text-xs text-slate-500">
                    {String(inv.roleCode).replaceAll("_", " ")} · {inv.department.name}
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(inv.createdAt).toLocaleDateString("en-GB")}
                </span>
              </li>
            ))}
            {pending.length === 0 && (
              <li className="px-4 py-8 text-center text-slate-500">None pending.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
