import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { createExam, createQuiz, finalizeGrade, calculateCourseGrade } from "@/lib/assessments";
import { issueCertificate, generateTranscript, evaluateCertificateEligibility } from "@/lib/certificates";

export const dynamic = "force-dynamic";

async function createExamAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await createExam({
    courseId: String(formData.get("courseId") || ""),
    title: String(formData.get("title") || ""),
    instructions: String(formData.get("instructions") || "") || undefined,
    opensAt: formData.get("opensAt") ? new Date(String(formData.get("opensAt"))) : undefined,
    closesAt: formData.get("closesAt") ? new Date(String(formData.get("closesAt"))) : undefined,
    timeLimitMinutes: formData.get("timeLimitMinutes")
      ? Number(formData.get("timeLimitMinutes"))
      : undefined,
    actorId: user.id,
    publish: formData.get("publish") === "on",
  });
  redirect("/staff/exams?exam=1");
}

async function createQuizAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const optionsRaw = String(formData.get("options") || "");
  const options = optionsRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const correct = String(formData.get("correct") || "").trim();
  await createQuiz({
    courseId: String(formData.get("courseId") || ""),
    title: String(formData.get("title") || ""),
    instructions: String(formData.get("instructions") || "") || undefined,
    questions: [
      {
        prompt: String(formData.get("prompt") || ""),
        options: options.length ? options : undefined,
        correct: correct || undefined,
        marks: Number(formData.get("marks") || 1),
      },
    ],
    publish: formData.get("publish") === "on",
  });
  redirect("/staff/exams?quiz=1");
}

async function issueCertAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await issueCertificate({
    userId: String(formData.get("userId") || ""),
    programmeId: String(formData.get("programmeId") || ""),
    actorId: user.id,
  });
  redirect("/staff/exams?cert=1");
}

async function transcriptAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await generateTranscript({
    userId: String(formData.get("userId") || ""),
    programmeId: String(formData.get("programmeId") || ""),
    actorId: user.id,
  });
  redirect("/staff/exams?transcript=1");
}

export default async function ExamsWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/exams");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["EXAM_OFFICER", "ACADEMIC_DIRECTOR", "PRINCIPAL", "REGISTRAR", "LECTURER"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const courses = await db.course.findMany({
    where: { published: true },
    include: { programme: { select: { name: true } } },
    orderBy: { title: "asc" },
    take: 50,
  });

  const exams = await db.exam.findMany({
    include: { course: true, _count: { select: { attempts: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const activeEnrollments = await db.enrollment.findMany({
    where: { status: { in: ["ACTIVE", "COMPLETED"] } },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      programme: { select: { id: true, name: true } },
    },
    take: 40,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Exams
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Assessments & awards</h1>
            <Link href="/staff/exams/quiz-builder" className="mt-1 block text-sm text-emerald-700 hover:underline">
              Multi-question quiz builder →
            </Link>
            <Link href="/staff/exams/marking" className="mt-1 block text-sm text-emerald-700 hover:underline">
              Exam marking queue →
            </Link>
            <Link href="/staff/exams/grades" className="mt-1 block text-sm text-emerald-700 hover:underline">
              Grade book →
            </Link>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        {/* Create exam */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Publish exam</h2>
          <form action={createExamAction} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Course
              <select name="courseId" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.programme?.name || "—"})
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              Title
              <input name="title" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Opens
              <input name="opensAt" type="datetime-local" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm">
              Closes
              <input name="closesAt" type="datetime-local" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" name="publish" defaultChecked /> Publish immediately
            </label>
            <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white sm:col-span-2">
              Create exam
            </button>
          </form>
        </section>

        {/* Quick quiz */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Quick quiz (one question)</h2>
          <form action={createQuizAction} className="mt-3 space-y-3">
            <select name="courseId" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <input name="title" required placeholder="Quiz title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="prompt" required placeholder="Question prompt" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="options" rows={3} placeholder={"Options (one per line)\nA\nB\nC"} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="correct" placeholder="Correct option (exact match)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publish" defaultChecked /> Publish
            </label>
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Create quiz
            </button>
          </form>
        </section>

        {/* Recent exams */}
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Recent exams</h2>
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {exams.map((e) => (
              <li key={e.id} className="flex justify-between px-4 py-3 text-sm">
                <span>
                  <strong>{e.title}</strong>
                  <span className="text-slate-500"> · {e.course.title} · {e.status}</span>
                </span>
                <span className="text-xs text-slate-400">{e._count.attempts} attempts</span>
              </li>
            ))}
            {exams.length === 0 && (
              <li className="px-4 py-8 text-center text-slate-500">No exams yet.</li>
            )}
          </ul>
        </section>

        {/* Issue certificate / transcript */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Issue certificate / transcript</h2>
          <p className="mt-1 text-xs text-slate-500">
            Certificate requires academic completion and financial clearance. Issuance is audited.
          </p>
          <ul className="mt-4 space-y-3">
            {activeEnrollments.slice(0, 15).map((en) => {
              const name =
                [en.user.firstName, en.user.lastName].filter(Boolean).join(" ") || en.user.email;
              return (
                <li key={en.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{en.programme.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <form action={issueCertAction}>
                      <input type="hidden" name="userId" value={en.user.id} />
                      <input type="hidden" name="programmeId" value={en.programme.id} />
                      <button type="submit" className="rounded bg-emerald-700 px-2 py-1 text-xs text-white">
                        Issue cert
                      </button>
                    </form>
                    <form action={transcriptAction}>
                      <input type="hidden" name="userId" value={en.user.id} />
                      <input type="hidden" name="programmeId" value={en.programme.id} />
                      <button type="submit" className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700">
                        Transcript
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
