import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { startExamAttempt, submitExamAttempt } from "@/lib/assessments";

export const dynamic = "force-dynamic";

async function startAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const examId = String(formData.get("examId") || "");
  try {
    const attempt = await startExamAttempt({ examId, userId: user.id });
    redirect(`/student/exams/${examId}?attempt=${attempt.id}`);
  } catch (e: any) {
    redirect(`/student/exams/${examId}?error=${encodeURIComponent(e.message || "Cannot start")}`);
  }
}

async function submitAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const attemptId = String(formData.get("attemptId") || "");
  const examId = String(formData.get("examId") || "");
  const answers: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("q_")) answers[k.slice(2)] = String(v);
  }
  await submitExamAttempt({ attemptId, userId: user.id, answers });
  redirect(`/student/exams/${examId}?done=1`);
}

export default async function ExamTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ attempt?: string; done?: string; error?: string }>;
}) {
  const { examId } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const exam = await db.exam.findUnique({
    where: { id: examId },
    include: {
      questions: { orderBy: { orderIndex: "asc" } },
      course: true,
      attempts: { where: { userId: user.id }, orderBy: { attemptNo: "desc" } },
    },
  });
  if (!exam || exam.status !== "PUBLISHED") redirect("/student/exams");

  const attempt = sp.attempt
    ? exam.attempts.find((a) => a.id === sp.attempt)
    : exam.attempts.find((a) => a.status === "IN_PROGRESS");

  const latest = exam.attempts.find((a) =>
    ["AUTO_MARKED", "FINALIZED", "MANUAL_REVIEW", "SUBMITTED"].includes(a.status)
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link href="/student/exams" className="text-xs text-emerald-700 hover:underline">
          ← Exams
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{exam.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{exam.course.title}</p>
        {exam.instructions && (
          <p className="mt-3 text-sm text-slate-600">{exam.instructions}</p>
        )}

        {sp.error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {sp.error}
          </div>
        )}

        {sp.done && latest && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
            <p className="font-semibold text-emerald-900">Exam submitted</p>
            <p className="text-sm text-emerald-800">
              Status: {latest.status.replaceAll("_", " ")}
              {latest.finalScore != null || latest.autoScore != null
                ? ` · Score: ${Number(latest.finalScore ?? latest.autoScore)}%`
                : " · Awaiting marking"}
            </p>
          </div>
        )}

        {!attempt && !sp.done && (
          <form action={startAction} className="mt-8">
            <input type="hidden" name="examId" value={exam.id} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Begin exam attempt
            </button>
          </form>
        )}

        {attempt && attempt.status === "IN_PROGRESS" && (
          <form action={submitAction} className="mt-8 space-y-6">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="examId" value={exam.id} />
            {exam.questions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No online questions configured. Follow staff instructions for file or venue
                submission.
              </p>
            ) : (
              exam.questions.map((q, i) => {
                const options: string[] = q.optionsJson
                  ? (() => {
                      try {
                        return JSON.parse(q.optionsJson!);
                      } catch {
                        return [];
                      }
                    })()
                  : [];
                return (
                  <fieldset key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <legend className="text-sm font-medium text-slate-900">
                      {i + 1}. {q.prompt}{" "}
                      <span className="text-xs text-slate-400">({Number(q.marks)} marks)</span>
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
                      <textarea
                        name={`q_${q.id}`}
                        rows={q.type === "ESSAY" ? 5 : 2}
                        required
                        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    )}
                  </fieldset>
                );
              })
            )}
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Submit exam
            </button>
          </form>
        )}
      </div>
      </main>
  );
}
