import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { getStudentLearningContext, submitAssignment } from "@/lib/lms";
import { humanStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

async function submitAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await submitAssignment({
    assignmentId: String(formData.get("assignmentId") || ""),
    userId: user.id,
    textAnswer: String(formData.get("textAnswer") || "") || undefined,
    fileUrl: String(formData.get("fileUrl") || "") || undefined,
  });
  redirect("/student/assignments?submitted=1");
}

export default async function StudentAssignmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/assignments");

  const ctx = await getStudentLearningContext(user.id);
  if (!ctx) redirect("/student");

  const db = getDb();
  const courseIds = ctx.enrollment.programme.courses.map((c) => c.id);
  const assignments = db
    ? await db.assignment.findMany({
        where: { courseId: { in: courseIds }, status: "PUBLISHED" },
        include: {
          course: { select: { title: true } },
          submissions: { where: { userId: user.id } },
        },
        orderBy: { dueAt: "asc" },
      })
    : [];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Assessments</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Assignments</h1>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {!ctx.canAccessFull && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Assignment submission requires learning access.{" "}
            <Link href="/student/finance" className="underline">
              Check finance
            </Link>
          </div>
        )}

        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No published assignments yet.</p>
        ) : (
          <ul className="space-y-6">
            {assignments.map((a) => {
              const sub = a.submissions[0];
              return (
                <li key={a.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="font-semibold text-slate-900">{a.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {a.course.title} · Max {Number(a.maxMarks)} marks
                    {a.dueAt
                      ? ` · Due ${new Date(a.dueAt).toLocaleString("en-GB")}`
                      : ""}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{a.instructions}</p>

                  {sub ? (
                    <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <p className="font-medium text-slate-800">
                        Submitted · {humanStatus(sub.status)}
                        {sub.score != null ? ` · Score: ${Number(sub.score)}` : ""}
                      </p>
                      {sub.feedback && (
                        <p className="mt-1 text-slate-600">Feedback: {sub.feedback}</p>
                      )}
                    </div>
                  ) : ctx.canAccessFull ? (
                    <form action={submitAction} className="mt-4 space-y-3">
                      <input type="hidden" name="assignmentId" value={a.id} />
                      <textarea
                        name="textAnswer"
                        rows={3}
                        placeholder="Your response"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        name="fileUrl"
                        placeholder="File URL (optional — upload via storage then paste link)"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                      >
                        Submit
                      </button>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </main>
  );
}
