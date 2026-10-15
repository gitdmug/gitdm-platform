import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { listCampusLibrary } from "@/lib/library";
import { listPublishedAnnouncements } from "@/lib/announcements";
import { getDb } from "@/lib/db";
import { money } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function StudentLibraryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/library");

  const resources = await listCampusLibrary();
  const announcements = await listPublishedAnnouncements("STUDENTS");
  let campusBooks: any[] = [];
  try {
    const db = getDb();
    if (db) {
      campusBooks = await db.storeProduct.findMany({
        where: { status: "ACTIVE", audience: { in: ["STUDENT", "PUBLIC"] } },
        orderBy: { price: "asc" },
        take: 20,
      });
    }
  } catch {
    campusBooks = [];
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Campus</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Library & notices</h1>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {announcements.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-900">Announcements</h2>
            <ul className="mt-3 space-y-2">
              {announcements.slice(0, 5).map((a) => (
                <li key={a.id} className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Resources</h2>
          {resources.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No library resources available yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
              {resources.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{r.title}</p>
                    <p className="text-xs text-slate-500">
                      {r.type}
                      {r.author ? ` · ${r.author}` : ""}
                    </p>
                    {r.description && (
                      <p className="mt-1 text-sm text-slate-600">{r.description}</p>
                    )}
                  </div>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-sm text-emerald-700 hover:underline"
                    >
                      Open
                    </a>
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
