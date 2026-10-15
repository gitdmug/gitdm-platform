import Link from "next/link";
import { listPublishedAnnouncements } from "@/lib/announcements";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PublicAnnouncementsPage() {
  const items = await listPublishedAnnouncements("PUBLIC");
  // Also show ALL
  const all = await listPublishedAnnouncements();
  const seen = new Set(items.map((i) => i.id));
  for (const a of all) {
    if (!seen.has(a.id) && (!a.audience || a.audience === "ALL" || a.audience === "PUBLIC")) {
      items.push(a);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-sm font-medium text-emerald-700">GITDM</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Announcements</h1>
        <p className="mt-2 text-slate-600">Official notices from the institute.</p>

        {items.length === 0 ? (
          <p className="mt-10 text-sm text-slate-500">No public announcements at this time.</p>
        ) : (
          <ul className="mt-10 space-y-4">
            {items.map((a) => (
              <li key={a.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <time className="text-xs text-slate-500">
                  {a.publishedAt
                    ? new Date(a.publishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : ""}
                </time>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">{a.title}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {a.body}
                </p>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-12 text-center text-sm">
          <Link href="/" className="text-emerald-700 hover:underline">
            Return home
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
