import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { calculateCourseGrade, finalizeGrade } from "@/lib/assessments";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

async function finalizeAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const gradeId = String(formData.get("gradeId") || "");
  const studentId = String(formData.get("studentId") || "");
  const courseTitle = String(formData.get("courseTitle") || "Course");
  const total = String(formData.get("total") || "");
  await finalizeGrade(gradeId, user.id);
  try {
    await notifyUser({
      userId: studentId,
      type: "ACADEMIC",
      title: "Grade finalised",
      body: `Your grade for ${courseTitle} has been finalised: ${total}%.`,
      email: true,
    });
  } catch {
    // non-blocking
  }
  redirect("/staff/exams/grades?finalized=1");
}

async function recalcAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await calculateCourseGrade({
    userId: String(formData.get("userId") || ""),
    courseId: String(formData.get("courseId") || ""),
  });
  redirect("/staff/exams/grades?recalc=1");
}

export default async function GradeBookPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["EXAM_OFFICER", "ACADEMIC_DIRECTOR", "PRINCIPAL", "LECTURER", "REGISTRAR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const sp = await searchParams;
  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const courses = await db.course.findMany({
    where: { published: true },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  const courseId = sp.courseId || courses[0]?.id;

  const enrollments = courseId
    ? await db.courseEnrollment.findMany({
        where: { courseId, status: "ACTIVE" },
        include: {
          enrollment: {
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
        take: 80,
      })
    : [];

  const rows = [];
  for (const ce of enrollments) {
    try {
      const result = await calculateCourseGrade({
        userId: ce.enrollment.userId,
        courseId: courseId!,
      });
      rows.push({
        user: ce.enrollment.user,
        studentNumber: ce.enrollment.studentNumber,
        ...result,
      });
    } catch {
      rows.push({
        user: ce.enrollment.user,
        studentNumber: ce.enrollment.studentNumber,
        grade: null,
        passMark: 50,
        passed: false,
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/exams" className="text-xs text-emerald-700 hover:underline">
              ← Exams
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">Grade book</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <form method="get" className="mb-6">
          <select
            name="courseId"
            defaultValue={courseId || ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
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

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">A</th>
                <th className="px-4 py-3">Q</th>
                <th className="px-4 py-3">E</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No course enrolments.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const name =
                    [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") ||
                    row.user.email;
                  const g = row.grade;
                  return (
                    <tr key={row.user.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{name}</p>
                        <p className="font-mono text-[10px] text-slate-400">
                          {row.studentNumber || row.user.id.slice(-8)}
                        </p>
                      </td>
                      <td className="px-4 py-3">{g ? `${Number(g.assignmentPercent)}%` : "—"}</td>
                      <td className="px-4 py-3">{g ? `${Number(g.quizPercent)}%` : "—"}</td>
                      <td className="px-4 py-3">{g ? `${Number(g.examPercent)}%` : "—"}</td>
                      <td className="px-4 py-3 font-semibold">
                        {g ? `${Number(g.totalPercent)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {g?.status || "—"}
                        {g && (
                          <span className={row.passed ? " text-emerald-700" : " text-red-700"}>
                            {" "}
                            · {row.passed ? "Pass" : "Fail"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <form action={recalcAction}>
                            <input type="hidden" name="userId" value={row.user.id} />
                            <input type="hidden" name="courseId" value={courseId!} />
                            <button type="submit" className="text-xs text-slate-600 hover:underline">
                              Recalc
                            </button>
                          </form>
                          {g && g.status !== "FINAL" && (
                            <form action={finalizeAction}>
                              <input type="hidden" name="gradeId" value={g.id} />
                              <input type="hidden" name="studentId" value={row.user.id} />
                              <input
                                type="hidden"
                                name="courseTitle"
                                value={courses.find((c) => c.id === courseId)?.title || ""}
                              />
                              <input
                                type="hidden"
                                name="total"
                                value={String(Number(g.totalPercent))}
                              />
                              <button
                                type="submit"
                                className="text-xs font-medium text-emerald-700 hover:underline"
                              >
                                Finalise
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
