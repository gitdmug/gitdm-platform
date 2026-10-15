import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { createSupportTicket, TICKET_CATEGORIES } from "@/lib/student-affairs";
import { humanStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

async function submitTicket(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await createSupportTicket({
    requesterId: user.id,
    subject: String(formData.get("subject") || ""),
    description: String(formData.get("description") || ""),
    category: String(formData.get("category") || "GENERAL") as any,
    priority: String(formData.get("priority") || "NORMAL"),
  });
  redirect("/student/support?sent=1");
}

export default async function StudentSupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/support");

  const db = getDb();
  const tickets = db
    ? await db.supportTicket.findMany({
        where: { requesterId: user.id },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Support</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Student Affairs</h1>
            <p className="mt-1 text-sm text-slate-500">
              All tickets are routed to Student Affairs for central tracking and follow-up.
            </p>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        <form action={submitTicket} className="mb-10 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">New ticket</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Category</span>
            <select name="category" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Subject</span>
            <input name="subject" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Description</span>
            <textarea name="description" required rows={4} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Priority</span>
            <select name="priority" defaultValue="NORMAL" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Submit to Student Affairs
          </button>
        </form>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Your tickets</h2>
          {tickets.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No tickets yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {tickets.map((t) => (
                <li key={t.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{t.subject}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {t.category} · {humanStatus(t.status)} ·{" "}
                        {new Date(t.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {t.id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  {t.staffReply && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="text-xs font-medium text-slate-500">Staff reply: </span>
                      {t.staffReply}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </main>
  );
}
