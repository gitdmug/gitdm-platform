import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getStudentLearningContext } from "@/lib/lms";
import { calculateCourseGrade } from "@/lib/assessments";

export const dynamic = "force-dynamic";

export default async function StudentGradesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/grades");

  const ctx = await getStudentLearningContext(user.id);
  if (!ctx) redirect("/student");

  const courses = ctx.enrollment.programme.courses;
  const rows = [];
  for (const course of courses) {
    try {
      const result = await calculateCourseGrade({
        userId: user.id,
        courseId: course.id,
        periodId: ctx.enrollment.periodId,
      });
      rows.push({ course, ...result });
    } catch {
      rows.push({
        course,
        grade: null,
        passMark: 50,
        passed: false,
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Academic record</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Grades</h1>
            <p className="mt-1 text-sm text-slate-500">
              Weighted from assignments, quizzes and exams using programme rules.
            </p>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Assign.</th>
                <th className="px-4 py-3">Quiz</th>
                <th className="px-4 py-3">Exam</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No courses yet.
                  </td>
                </tr>
              ) : (
                rows.map(({ course, grade, passMark, passed }) => (
                  <tr key={course.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{course.title}</td>
                    <td className="px-4 py-3">{grade ? `${Number(grade.assignmentPercent)}%` : "—"}</td>
                    <td className="px-4 py-3">{grade ? `${Number(grade.quizPercent)}%` : "—"}</td>
                    <td className="px-4 py-3">{grade ? `${Number(grade.examPercent)}%` : "—"}</td>
                    <td className="px-4 py-3 font-semibold">
                      {grade ? `${Number(grade.totalPercent)}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {grade ? (
                        <span
                          className={
                            passed ? "text-emerald-700 font-medium" : "text-red-700 font-medium"
                          }
                        >
                          {passed ? "Pass" : "Fail"}
                          <span className="ml-1 text-xs text-slate-400">({passMark}%)</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </main>
  );
}
