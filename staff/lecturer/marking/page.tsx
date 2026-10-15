import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { listSubmissionsForCourse, gradeAssignmentSubmission } from "@/lib/lms";

export const dynamic = "force-dynamic";

async function gradeAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await gradeAssignmentSubmission({
    submissionId: String(formData.get("submissionId") || ""),
    score: Number(formData.get("score") || 0),
    feedback: String(formData.get("feedback") || "") || undefined,
    graderId: user.id,
  });
  redirect("/staff/lecturer/marking?graded=1");
}

export default async function MarkingPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/lecturer/marking");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["LECTURER", "FACULTY", "ACADEMIC_DIRECTOR", "PRINCIPAL", "EXAM_OFFICER"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const sp = await searchParams;
  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const isDirector = roleCodes.some((c: string) =>
    ["ACADEMIC_DIRECTOR", "PRINCIPAL", "EXAM_OFFICER"].includes(c)
  );

  const courses = await db.course.findMany({
    where: isDirector
      ? { published: true }
      : { faculty: { some: { userId: user.id } }, published: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const courseId = sp.courseId || courses[0]?.id;
  const submissions = courseId ? await listSubmissionsForCourse(courseId) : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/lecturer" className="text-xs text-emerald-700 hover:underline">
              ← Lecturer workspace
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Assignment marking</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <form method="get" className="mb-6">
          <select
            name="courseId"
            defaultValue={courseId || ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            onChange={undefined}
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <button type="submit" className="ml-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
            Load
          </button>
        </form>

        {submissions.length === 0 ? (
          <p className="text-sm text-slate-500">No submissions for this course.</p>
        ) : (
          <ul className="space-y-4">
            {submissions.map((s) => {
              const name =
                [s.user.firstName, s.user.lastName].filter(Boolean).join(" ") || s.user.email;
              return (
                <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{s.assignment.title}</p>
                      <p className="text-xs text-slate-500">
                        {name} · {s.status}
                        {s.submittedAt
                          ? ` · ${new Date(s.submittedAt).toLocaleString("en-GB")}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">Max {Number(s.assignment.maxMarks)}</p>
                  </div>
                  {s.textAnswer && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      {s.textAnswer}
                    </p>
                  )}
                  {s.fileUrl && (
                    <a
                      href={s.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-sm text-emerald-700 hover:underline"
                    >
                      Open file
                    </a>
                  )}
                  {s.status === "GRADED" ? (
                    <p className="mt-3 text-sm text-emerald-700">
                      Score: {Number(s.score)} / {Number(s.assignment.maxMarks)}
                      {s.feedback ? ` — ${s.feedback}` : ""}
                    </p>
                  ) : (
                    <form action={gradeAction} className="mt-4 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="submissionId" value={s.id} />
                      <label className="text-xs">
                        Score
                        <input
                          name="score"
                          type="number"
                          step="0.01"
                          min={0}
                          max={Number(s.assignment.maxMarks)}
                          required
                          className="mt-1 block w-24 rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                      </label>
                      <label className="text-xs flex-1 min-w-[12rem]">
                        Feedback
                        <input
                          name="feedback"
                          className="mt-1 block w-full rounded border border-slate-200 px-2 py-1 text-sm"
                        />
                      </label>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white"
                      >
                        Save grade
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
