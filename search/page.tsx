import Link from "next/link";
import { getDb } from "@/lib/db";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const db = getDb();

  let programmes: any[] = [];
  let courses: any[] = [];
  let announcements: any[] = [];

  if (db && query.length >= 2) {
    const [p, c, a] = await Promise.all([
      db.programme.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 15,
        orderBy: { name: "asc" },
      }),
      db.course.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ],
        },
        include: { programme: { select: { name: true } } },
        take: 15,
      }),
      db.announcement.findMany({
        where: {
          publishedAt: { not: null },
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { body: { contains: query, mode: "insensitive" } },
          ],
        },
        take: 10,
        orderBy: { publishedAt: "desc" },
      }),
    ]);
    programmes = p;
    courses = c;
    announcements = a;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Search</h1>
        <form method="get" className="mt-4 flex gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Programmes, courses, notices…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
            Search
          </button>
        </form>

        {!query && (
          <p className="mt-8 text-sm text-slate-500">Enter at least 2 characters to search.</p>
        )}
        {query && query.length < 2 && (
          <p className="mt-8 text-sm text-slate-500">Enter at least 2 characters.</p>
        )}

        {query.length >= 2 && (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-slate-900">
                Programmes ({programmes.length})
              </h2>
              {programmes.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No matches.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {programmes.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/programmes#${p.code.toLowerCase()}`}
                        className="block rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300"
                      >
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.code} · {p.durationMonths} months
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-900">Courses ({courses.length})</h2>
              {courses.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No matches.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {courses.map((c) => (
                    <li key={c.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <p className="font-medium text-slate-900">{c.title}</p>
                      <p className="text-xs text-slate-500">
                        {c.code} · {c.programme?.name || "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-slate-900">
                Notices ({announcements.length})
              </h2>
              {announcements.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No matches.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {announcements.map((a) => (
                    <li key={a.id}>
                      <Link
                        href="/announcements"
                        className="block rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300"
                      >
                        <p className="font-medium text-slate-900">{a.title}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
