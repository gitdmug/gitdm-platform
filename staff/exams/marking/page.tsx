import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { listPendingExamAttempts, markExamAttempt } from "@/lib/exam-marking";

export const dynamic = "force-dynamic";

async function markAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const attemptId = String(formData.get("attemptId") || "");
  const marks: Record<string, number> = {};
  const feedback: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("mark_")) marks[k.slice(5)] = Number(v);
    if (k.startsWith("fb_")) feedback[k.slice(3)] = String(v);
  }
  await markExamAttempt({
    attemptId,
    marks,
    feedback,
    actorId: user.id,
    finalize: true,
  });
  redirect("/staff/exams/marking?done=1");
}

export default async function ExamMarkingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["EXAM_OFFICER", "LECTURER", "ACADEMIC_DIRECTOR", "PRINCIPAL", "FACULTY"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const pending = await listPendingExamAttempts();
  const db = getDb();

  // Load questions for each attempt's exam
  const detail = [];
  for (const att of pending) {
    const questions = db
      ? await db.examQuestion.findMany({
          where: { examId: att.exam.id },
          orderBy: { orderIndex: "asc" },
        })
      : [];
    detail.push({ att, questions });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/exams" className="text-xs text-emerald-700 hover:underline">
              ← Exams
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Exam marking</h1>
            <p className="text-sm text-slate-500">Manual review queue</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        {detail.length === 0 ? (
          <p className="text-sm text-slate-500">No attempts awaiting marking.</p>
        ) : (
          detail.map(({ att, questions }) => {
            const name =
              [att.user.firstName, att.user.lastName].filter(Boolean).join(" ") ||
              att.user.email;
            return (
              <form
                key={att.id}
                action={markAction}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <input type="hidden" name="attemptId" value={att.id} />
                <div className="mb-4">
                  <p className="font-semibold text-slate-900">{att.exam.title}</p>
                  <p className="text-xs text-slate-500">
                    {name} · attempt {att.attemptNo} · {att.status}
                    {att.submittedAt
                      ? ` · ${new Date(att.submittedAt).toLocaleString("en-GB")}`
                      : ""}
                  </p>
                </div>
                <ul className="space-y-4">
                  {questions.map((q) => {
                    const answer = att.answers.find((a) => a.questionId === q.id);
                    return (
                      <li key={q.id} className="rounded-lg border border-slate-100 p-3">
                        <p className="text-sm font-medium text-slate-800">
                          {q.prompt}{" "}
                          <span className="text-xs text-slate-400">
                            (max {Number(q.marks)})
                          </span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                          Answer: {answer?.answerJson || "—"}
                        </p>
                        {answer?.autoMarks != null && (
                          <p className="text-xs text-emerald-700">
                            Auto: {Number(answer.autoMarks)}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <input
                            name={`mark_${q.id}`}
                            type="number"
                            step="0.01"
                            min={0}
                            max={Number(q.marks)}
                            defaultValue={
                              answer?.manualMarks != null
                                ? Number(answer.manualMarks)
                                : answer?.autoMarks != null
                                ? Number(answer.autoMarks)
                                : undefined
                            }
                            placeholder="Marks"
                            className="w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                          />
                          <input
                            name={`fb_${q.id}`}
                            placeholder="Feedback"
                            className="min-w-[12rem] flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="submit"
                  className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
                >
                  Finalise marks
                </button>
              </form>
            );
          })
        )}
      </div>
    </div>
  );
}
