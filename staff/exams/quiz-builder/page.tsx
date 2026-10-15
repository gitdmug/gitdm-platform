import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { createQuiz } from "@/lib/assessments";

export const dynamic = "force-dynamic";

async function buildQuizAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const courseId = String(formData.get("courseId") || "");
  const title = String(formData.get("title") || "");
  const instructions = String(formData.get("instructions") || "") || undefined;
  const passMark = Number(formData.get("passMarkPercent") || 50);
  const attempts = Number(formData.get("attemptsAllowed") || 1);
  const timeLimit = formData.get("timeLimitMinutes")
    ? Number(formData.get("timeLimitMinutes"))
    : undefined;
  const publish = formData.get("publish") === "on";

  const questions: Array<{
    prompt: string;
    options?: string[];
    correct?: string;
    marks?: number;
  }> = [];

  // Expect q_N_prompt, q_N_options (newline), q_N_correct, q_N_marks for N=1..20
  for (let i = 1; i <= 20; i++) {
    const prompt = String(formData.get(`q_${i}_prompt`) || "").trim();
    if (!prompt) continue;
    const optionsRaw = String(formData.get(`q_${i}_options`) || "");
    const options = optionsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const correct = String(formData.get(`q_${i}_correct`) || "").trim();
    const marks = Number(formData.get(`q_${i}_marks`) || 1);
    questions.push({
      prompt,
      options: options.length ? options : undefined,
      correct: correct || undefined,
      marks,
    });
  }

  if (questions.length === 0) throw new Error("Add at least one question.");

  await createQuiz({
    courseId,
    title,
    instructions,
    passMarkPercent: passMark,
    attemptsAllowed: attempts,
    timeLimitMinutes: timeLimit,
    questions,
    publish,
  });

  redirect("/staff/exams?quiz=1");
}

export default async function QuizBuilderPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["EXAM_OFFICER", "LECTURER", "ACADEMIC_DIRECTOR", "PRINCIPAL", "FACULTY"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  const courses = db
    ? await db.course.findMany({
        where: { published: true },
        include: { programme: { select: { name: true } } },
        orderBy: { title: "asc" },
      })
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/exams" className="text-xs text-emerald-700 hover:underline">
              ← Exams
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Quiz builder</h1>
            <p className="text-sm text-slate-500">Up to 20 objective questions</p>
          </div>
        </div>
      </header>

      <form action={buildQuizAction} className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <select name="courseId" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} ({c.programme?.name || "—"})
              </option>
            ))}
          </select>
          <input name="title" required placeholder="Quiz title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea name="instructions" rows={2} placeholder="Instructions" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Pass %
              <input name="passMarkPercent" type="number" defaultValue={50} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Attempts
              <input name="attemptsAllowed" type="number" defaultValue={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm">
              Time limit (min)
              <input name="timeLimitMinutes" type="number" placeholder="Optional" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="publish" defaultChecked /> Publish immediately
          </label>
        </section>

        {[1, 2, 3, 4, 5].map((i) => (
          <section key={i} className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Question {i}</h2>
            <input
              name={`q_${i}_prompt`}
              placeholder={i === 1 ? "Required — question text" : "Leave blank to skip"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              {...(i === 1 ? { required: true } : {})}
            />
            <textarea
              name={`q_${i}_options`}
              rows={3}
              placeholder={"Options, one per line\nOption A\nOption B\nOption C"}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                name={`q_${i}_correct`}
                placeholder="Correct option (exact match)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                name={`q_${i}_marks`}
                type="number"
                defaultValue={1}
                placeholder="Marks"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </section>
        ))}

        <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800">
          Create quiz
        </button>
      </form>
    </div>
  );
}
