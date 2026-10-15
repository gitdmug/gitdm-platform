import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { listLibraryResources, addLibraryResource } from "@/lib/library";

export const dynamic = "force-dynamic";

async function addAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await addLibraryResource({
    title: String(formData.get("title") || ""),
    author: String(formData.get("author") || "") || undefined,
    type: String(formData.get("type") || "BOOK"),
    description: String(formData.get("description") || "") || undefined,
    url: String(formData.get("url") || "") || undefined,
    accessScope: String(formData.get("accessScope") || "CAMPUS"),
    actorId: user.id,
  });
  redirect("/staff/library?added=1");
}

export default async function LibraryStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/library");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["LIBRARY", "PRINCIPAL", "ACADEMIC_DIRECTOR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const resources = await listLibraryResources({ availableOnly: false });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Library
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Learning resources</h1>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <form action={addAction} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Add resource</h2>
          <input name="title" required placeholder="Title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="author" placeholder="Author" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {["BOOK", "ARTICLE", "VIDEO", "JOURNAL", "REPORT", "OTHER"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select name="accessScope" defaultValue="CAMPUS" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="PUBLIC">Public</option>
              <option value="CAMPUS">Campus only</option>
              <option value="ENROLLED">Enrolled students</option>
            </select>
          </div>
          <input name="url" placeholder="URL / file link" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea name="description" rows={2} placeholder="Description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
            Add to library
          </button>
        </form>

        <section>
          <h2 className="text-sm font-semibold text-slate-900">Catalogue ({resources.length})</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {resources.map((r) => (
              <li key={r.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{r.title}</p>
                  <p className="text-xs text-slate-500">
                    {r.type} · {r.accessScope}
                    {r.author ? ` · ${r.author}` : ""}
                    {!r.available ? " · unavailable" : ""}
                  </p>
                </div>
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline">
                    Open
                  </a>
                )}
              </li>
            ))}
            {resources.length === 0 && (
              <li className="px-4 py-8 text-center text-slate-500">No resources yet.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
