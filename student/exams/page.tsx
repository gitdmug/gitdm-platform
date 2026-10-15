import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { getStudentLearningContext } from "@/lib/lms";
import { startExamAttempt } from "@/lib/assessments";

export const dynamic = "force-dynamic";

async function startExamAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const examId = String(formData.get("examId") || "");
  try {
    await startExamAttempt({ examId, userId: user.id });
    redirect(`/student/exams?started=${examId}`);
  } catch (e: any) {
    redirect(`/student/exams?error=${encodeURIComponent(e.message || "Cannot start exam")}`);
  }
}

export default async function StudentExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; started?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/exams");
  const sp = await searchParams;

  const ctx = await getStudentLearningContext(user.id);
  if (!ctx) redirect("/student");

  const db = getDb();
  const courseIds = ctx.enrollment.programme.courses.map((c) => c.id);
  const exams = db
    ? await db.exam.findMany({
        where: { courseId: { in: courseIds }, status: "PUBLISHED" },
        include: {
          course: { select: { title: true } },
          attempts: { where: { userId: user.id }, orderBy: { attemptNo: "desc" } },
        },
        orderBy: { opensAt: "asc" },
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Assessments</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Exams</h1>
            <p className="mt-1 text-sm text-slate-500">
              Exam access requires full financial clearance for the examination threshold.
            </p>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {sp.error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {sp.error}
          </div>
        )}

        {exams.length === 0 ? (
          <p className="text-sm text-slate-500">No published exams yet.</p>
        ) : (
          <ul className="space-y-3">
            {exams.map((exam) => {
              const best = exam.attempts.find((a) => a.finalScore != null || a.autoScore != null);
              const score = best?.finalScore ?? best?.autoScore;
              const used = exam.attempts.filter((a) =>
                ["SUBMITTED", "AUTO_MARKED", "FINALIZED", "MANUAL_REVIEW"].includes(a.status)
              ).length;
              return (
                <li key={exam.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">{exam.title}</h2>
                      <p className="text-xs text-slate-500">
                        {exam.course.title}
                        {exam.opensAt
                          ? ` · Opens ${new Date(exam.opensAt).toLocaleString("en-GB")}`
                          : ""}
                        {exam.closesAt
                          ? ` · Closes ${new Date(exam.closesAt).toLocaleString("en-GB")}`
                          : ""}
                        {` · ${used}/${exam.attemptsAllowed} attempts`}
                      </p>
                      {score != null && (
                        <p className="mt-1 text-sm text-emerald-700">Score: {Number(score)}%</p>
                      )}
                    </div>
                    {used < exam.attemptsAllowed && (
                      <Link
                        href={`/student/exams/${exam.id}`}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        Open exam
                      </Link>
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
