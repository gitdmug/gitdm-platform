import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { getStudentLearningContext } from "@/lib/lms";
import { startQuizAttempt, submitQuizAttempt } from "@/lib/assessments";

export const dynamic = "force-dynamic";

async function startAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const quizId = String(formData.get("quizId") || "");
  const attempt = await startQuizAttempt({ quizId, userId: user.id });
  redirect(`/student/quizzes/${quizId}?attempt=${attempt.id}`);
}

async function submitAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const attemptId = String(formData.get("attemptId") || "");
  const quizId = String(formData.get("quizId") || "");
  const answers: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) {
      answers[key.slice(2)] = String(value);
    }
  }
  await submitQuizAttempt({ attemptId, userId: user.id, answers });
  redirect(`/student/quizzes/${quizId}?done=1`);
}

export default async function QuizTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attempt?: string; done?: string }>;
}) {
  const { quizId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const ctx = await getStudentLearningContext(user.id);
  if (!ctx?.canAccessFull) redirect("/student/quizzes");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const quiz = await db.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      attempts: { where: { userId: user.id }, orderBy: { attemptNo: "desc" } },
    },
  });
  if (!quiz || quiz.status !== "PUBLISHED") redirect("/student/quizzes");

  const attemptId = sp.attempt;
  const attempt = attemptId
    ? quiz.attempts.find((a) => a.id === attemptId)
    : quiz.attempts.find((a) => a.status === "IN_PROGRESS");

  const latestDone = quiz.attempts.find((a) => a.status === "AUTO_MARKED" || a.status === "FINALIZED");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link href="/student/quizzes" className="text-xs text-emerald-700 hover:underline">
          ← Quizzes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{quiz.title}</h1>
        {quiz.instructions && (
          <p className="mt-2 text-sm text-slate-600">{quiz.instructions}</p>
        )}

        {sp.done && latestDone && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="font-semibold text-emerald-900">
              Score: {Number(latestDone.score)}%
            </p>
            <p className="text-sm text-emerald-800">
              Pass mark: {Number(quiz.passMarkPercent)}% ·{" "}
              {Number(latestDone.score) >= Number(quiz.passMarkPercent) ? "Passed" : "Not passed"}
            </p>
          </div>
        )}

        {!attempt && !sp.done && (
          <form action={startAction} className="mt-8">
            <input type="hidden" name="quizId" value={quiz.id} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Start attempt
            </button>
          </form>
        )}

        {attempt && attempt.status === "IN_PROGRESS" && (
          <form action={submitAction} className="mt-8 space-y-6">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="quizId" value={quiz.id} />
            {quiz.questions.map((q, i) => {
              const options: string[] = q.optionsJson
                ? (() => {
                    try {
                      return JSON.parse(q.optionsJson);
                    } catch {
                      return [];
                    }
                  })()
                : [];
              return (
                <fieldset key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <legend className="text-sm font-medium text-slate-900">
                    {i + 1}. {q.prompt}
                  </legend>
                  {options.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {options.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`q_${q.id}`} value={opt} required />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      name={`q_${q.id}`}
                      required
                      className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  )}
                </fieldset>
              );
            })}
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Submit quiz
            </button>
          </form>
        )}
      </div>
      </main>
  );
}
