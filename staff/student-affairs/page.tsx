import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { listOpenTickets, respondToTicket } from "@/lib/student-affairs";
import { humanStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

async function replyAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await respondToTicket({
    ticketId: String(formData.get("ticketId") || ""),
    staffId: user.id,
    reply: String(formData.get("reply") || ""),
    status: String(formData.get("status") || "IN_PROGRESS") as any,
  });
  redirect("/staff/student-affairs?replied=1");
}

export default async function StudentAffairsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/student-affairs");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["STUDENT_AFFAIRS", "PRINCIPAL", "REGISTRAR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const tickets = await listOpenTickets();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Student Affairs
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Support tickets</h1>
            <p className="text-sm text-slate-500">
              Central queue — all student tickets route here
            </p>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
        {tickets.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No open tickets.</p>
        ) : (
          tickets.map((t) => {
            const name =
              [t.requester.firstName, t.requester.lastName].filter(Boolean).join(" ") ||
              t.requester.email;
            return (
              <article
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-900">{t.subject}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {name} · {t.category} · {t.priority} · {humanStatus(t.status)} ·{" "}
                      {new Date(t.createdAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {t.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{t.description}</p>
                {t.staffReply && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Previous reply: {t.staffReply}
                  </p>
                )}
                <form action={replyAction} className="mt-4 space-y-2">
                  <input type="hidden" name="ticketId" value={t.id} />
                  <textarea
                    name="reply"
                    required
                    rows={2}
                    placeholder="Reply to student…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      name="status"
                      defaultValue="IN_PROGRESS"
                      className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                    >
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="WAITING">Waiting on student</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Send reply
                    </button>
                  </div>
                </form>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
