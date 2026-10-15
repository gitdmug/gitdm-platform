import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { createModuleWithLesson } from "@/lib/lms";

export const dynamic = "force-dynamic";

async function createAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await createModuleWithLesson({
    courseId: String(formData.get("courseId") || ""),
    moduleTitle: String(formData.get("moduleTitle") || ""),
    lessonTitle: String(formData.get("lessonTitle") || ""),
    lessonContent: String(formData.get("lessonContent") || "") || undefined,
    videoUrl: String(formData.get("videoUrl") || "") || undefined,
    durationMinutes: formData.get("durationMinutes")
      ? Number(formData.get("durationMinutes"))
      : undefined,
    actorId: user.id,
  });
  redirect("/staff/lecturer/content?created=1");
}

export default async function ContentBuilderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["LECTURER", "FACULTY", "ACADEMIC_DIRECTOR", "PRINCIPAL", "ONLINE_INSTRUCTOR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const isDirector = roleCodes.some((c: string) =>
    ["ACADEMIC_DIRECTOR", "PRINCIPAL"].includes(c)
  );
  const courses = await db.course.findMany({
    where: isDirector
      ? { published: true }
      : { faculty: { some: { userId: user.id } }, published: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/lecturer" className="text-xs text-emerald-700 hover:underline">
              ← Lecturer workspace
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Content builder</h1>
            <p className="text-sm text-slate-500">Add a module and first lesson</p>
          </div>
        </div>
      </header>

      <form action={createAction} className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
        <select name="courseId" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input name="moduleTitle" required placeholder="Module title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input name="lessonTitle" required placeholder="Lesson title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <textarea name="lessonContent" rows={6} placeholder="Lesson content (HTML or plain text)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input name="videoUrl" placeholder="Video URL (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input name="durationMinutes" type="number" placeholder="Duration (minutes)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white">
          Create module & lesson
        </button>
      </form>
    </div>
  );
}
