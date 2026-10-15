import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { publishAnnouncement, listPublishedAnnouncements } from "@/lib/announcements";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function publishAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await publishAnnouncement({
    title: String(formData.get("title") || ""),
    body: String(formData.get("body") || ""),
    audience: String(formData.get("audience") || "ALL"),
    expiresAt: formData.get("expiresAt")
      ? new Date(String(formData.get("expiresAt")))
      : null,
    actorId: user.id,
  });
  redirect("/staff/marketing?published=1");
}

export default async function MarketingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/marketing");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["MARKETING", "PRINCIPAL", "ADMISSIONS"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const published = await listPublishedAnnouncements();
  const db = getDb();
  const drafts = db
    ? await db.announcement.findMany({
        where: { publishedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Marketing
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Announcements</h1>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <form action={publishAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Publish announcement</h2>
          <input name="title" required placeholder="Title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea name="body" required rows={4} placeholder="Message" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="audience" defaultValue="ALL" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="ALL">Everyone</option>
              <option value="STUDENTS">Students</option>
              <option value="STAFF">Staff</option>
              <option value="PUBLIC">Public website</option>
            </select>
            <input name="expiresAt" type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
            Publish
          </button>
        </form>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Live announcements</h2>
          <ul className="mt-3 space-y-3">
            {published.map((a) => (
              <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{a.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {a.audience || "ALL"} ·{" "}
                  {a.publishedAt
                    ? new Date(a.publishedAt).toLocaleDateString("en-GB")
                    : "—"}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
              </li>
            ))}
            {published.length === 0 && (
              <li className="text-sm text-slate-500">None published.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
