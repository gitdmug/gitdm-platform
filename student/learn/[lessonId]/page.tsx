import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { getStudentLearningContext, markLessonComplete } from "@/lib/lms";

export const dynamic = "force-dynamic";

async function completeAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const lessonId = String(formData.get("lessonId") || "");
  await markLessonComplete(user.id, lessonId);
  redirect(`/student/learn/${lessonId}?done=1`);
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const ctx = await getStudentLearningContext(user.id);
  if (!ctx?.canAccessFull) redirect("/student/learn");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: { include: { course: true } },
      resources: true,
      progress: { where: { userId: user.id } },
    },
  });
  if (!lesson || lesson.module.course.programmeId !== ctx.enrollment.programmeId) {
    redirect("/student/learn");
  }

  const done = lesson.progress[0]?.completed;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link href="/student/learn" className="text-xs text-emerald-700 hover:underline">
          ← All lessons
        </Link>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          {lesson.module.course.title} · {lesson.module.title}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{lesson.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {lesson.type.replaceAll("_", " ")}
          {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ""}
          {done ? " · Completed" : ""}
        </p>

        {lesson.videoUrl && (
          <div className="mt-6 aspect-video overflow-hidden rounded-xl bg-slate-900">
            <iframe
              src={lesson.videoUrl}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={lesson.title}
            />
          </div>
        )}

        {lesson.content && (
          <div className="prose prose-slate mt-6 max-w-none whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-800">
            {lesson.content}
          </div>
        )}

        {lesson.resources.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-slate-900">Resources</h2>
            <ul className="mt-3 space-y-2">
              {lesson.resources.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-700 hover:underline"
                  >
                    {r.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!done && (
          <form action={completeAction} className="mt-8">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Mark as complete
            </button>
          </form>
        )}
      </div>
      </main>
  );
}
