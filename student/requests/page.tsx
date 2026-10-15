import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { createSupportTicket } from "@/lib/student-affairs";

export const dynamic = "force-dynamic";

async function requestAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const kind = String(formData.get("kind") || "OTHER");
  const subject =
    kind === "DEFERMENT"
      ? "Request for deferment"
      : kind === "WITHDRAWAL"
      ? "Request for withdrawal"
      : String(formData.get("subject") || "Student request");
  await createSupportTicket({
    requesterId: user.id,
    subject,
    description: String(formData.get("body") || ""),
    category: "ACADEMIC",
  });
  redirect("/student/requests?sent=1");
}

export default async function StudentRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/requests");
  const sp = await searchParams;

  const db = getDb();
  const tickets = db
    ? await db.supportTicket.findMany({
        where: {
          requesterId: user.id,
          category: "ACADEMIC",
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  const enrollment = db
    ? await db.enrollment.findFirst({
        where: { userId: user.id, status: { in: ["ACTIVE", "PENDING"] } },
        select: { studentNumber: true, status: true, programme: { select: { name: true } } },
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Student portal</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Academic requests</h1>
            {enrollment?.studentNumber && (
              <p className="mt-1 text-sm text-slate-500">
                Student number: <span className="font-mono">{enrollment.studentNumber}</span>
              </p>
            )}
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {sp.sent && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Request submitted to Student Affairs / Registrar.
          </div>
        )}

        <form action={requestAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm">
            Request type
            <select name="kind" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="DEFERMENT">Deferment</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="ACADEMIC">Other academic</option>
            </select>
          </label>
          <label className="block text-sm">
            Details
            <textarea
              name="body"
              required
              rows={5}
              placeholder="Explain your circumstances and preferred effective date…"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
            Submit request
          </button>
        </form>

        {tickets.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900">Your requests</h2>
            <ul className="mt-3 space-y-2">
              {tickets.map((t) => (
                <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
                  <p className="font-medium text-slate-900">{t.subject}</p>
                  <p className="text-xs text-slate-500">
                    {t.status} · {new Date(t.createdAt).toLocaleDateString("en-GB")}
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
