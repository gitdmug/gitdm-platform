import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { getStudentLearningContext } from "@/lib/lms";

export const dynamic = "force-dynamic";

export default async function StudentQuizzesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/quizzes");

  const ctx = await getStudentLearningContext(user.id);
  if (!ctx) redirect("/student");

  const db = getDb();
  const courseIds = ctx.enrollment.programme.courses.map((c) => c.id);
  const quizzes = db
    ? await db.quiz.findMany({
        where: { courseId: { in: courseIds }, status: "PUBLISHED" },
        include: {
          course: { select: { title: true } },
          attempts: {
            where: { userId: user.id },
            orderBy: { attemptNo: "desc" },
          },
          _count: { select: { questions: true } },
        },
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Assessments</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Quizzes</h1>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {!ctx.canAccessFull && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Quizzes require learning access.{" "}
            <Link href="/student/finance" className="underline">
              Check finance
            </Link>
          </div>
        )}

        {quizzes.length === 0 ? (
          <p className="text-sm text-slate-500">No published quizzes yet.</p>
        ) : (
          <ul className="space-y-3">
            {quizzes.map((q) => {
              const best = q.attempts.find((a) => a.score != null);
              const remaining = q.attemptsAllowed - q.attempts.filter((a) =>
                ["AUTO_MARKED", "FINALIZED", "SUBMITTED"].includes(a.status)
              ).length;
              return (
                <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">{q.title}</h2>
                      <p className="text-xs text-slate-500">
                        {q.course.title} · {q._count.questions} questions · Pass{" "}
                        {Number(q.passMarkPercent)}%
                        {q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min` : ""}
                      </p>
                      {best && (
                        <p className="mt-1 text-sm text-emerald-700">
                          Best score: {Number(best.score)}%
                        </p>
                      )}
                    </div>
                    {ctx.canAccessFull && remaining > 0 && (
                      <Link
                        href={`/student/quizzes/${q.id}`}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        {best ? "Retake" : "Start"}
                      </Link>
                    )}
                    {remaining <= 0 && (
                      <span className="text-xs text-slate-400">No attempts left</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </main>
  );
}
