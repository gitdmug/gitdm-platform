import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getStudentLearningContext, getLessonProgressMap } from "@/lib/lms";

export const dynamic = "force-dynamic";

export default async function StudentLearnPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/learn");

  let ctx: Awaited<ReturnType<typeof getStudentLearningContext>> = null;
  try {
    ctx = await getStudentLearningContext(user.id);
  } catch (e) {
    console.error("[student/learn] context failed", e);
    return (
      <div className="campus-card">
        <p className="eyebrow">Learning</p>
        <h1 style={{ marginTop: 8, fontSize: 24 }}>Learning is temporarily unavailable</h1>
        <p style={{ color: "#64748b" }}>
          We could not load your course content. This is often a database schema update still
          pending. Please try again or contact support.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/student" className="btn btn-outline-dark btn-sm">
            Dashboard
          </Link>
          <Link href="/student/finance" className="btn btn-outline-dark btn-sm">
            Finance
          </Link>
        </div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="campus-card">
        <p className="eyebrow">Learning</p>
        <h1 style={{ marginTop: 8, fontSize: 24 }}>No active enrolment</h1>
        <p style={{ color: "#64748b" }}>
          Complete admissions and enrolment first to unlock modules and lessons.
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/applicant" className="btn btn-outline-dark btn-sm">
            Applicant portal
          </Link>
          <Link href="/admissions/apply" className="btn btn-primary btn-sm">
            Apply
          </Link>
        </div>
      </div>
    );
  }

  const { enrollment, canAccessFull, clearance } = ctx;
  const courses = enrollment.programme?.courses || [];
  const allLessonIds = courses.flatMap((c: any) =>
    (c.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => l.id))
  );

  let progress = new Map<string, boolean>();
  try {
    progress = await getLessonProgressMap(user.id, allLessonIds);
  } catch (e) {
    console.warn("[student/learn] progress map failed", e);
  }
  const completed = [...progress.values()].filter(Boolean).length;

  return (
    <>
      <div className="campus-card">
        <p className="eyebrow">Learning</p>
        <h1 style={{ marginTop: 8, fontSize: 24 }}>
          {enrollment.programme?.name || "Your programme"}
        </h1>
        <p style={{ color: "#64748b", marginTop: 6 }}>
          {completed} of {allLessonIds.length} lessons completed
          {!canAccessFull
            ? ` · Full content unlocks at ${clearance?.activationPercentRequired ?? 60}% tuition paid (you are at ${clearance?.percentPaid ?? 0}%)`
            : ""}
        </p>
        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/student" className="btn btn-outline-dark btn-sm">
            ← Dashboard
          </Link>
          {!canAccessFull && (
            <Link href="/student/finance" className="btn btn-primary btn-sm">
              View finance
            </Link>
          )}
        </div>
      </div>

      {!canAccessFull && (
        <div className="campus-card" style={{ borderColor: "#fde68a", background: "#fffbeb" }}>
          <strong>Limited access</strong>
          <p style={{ margin: "6px 0 0", color: "#92400e", fontSize: 14 }}>
            You can browse structure below. Full lesson materials unlock when payment clearance is
            met. <Link href="/student/finance">Pay tuition →</Link>
          </p>
        </div>
      )}

      {courses.length === 0 ? (
        <div className="campus-card">
          <h3 style={{ margin: 0 }}>No published courses yet</h3>
          <p style={{ color: "#64748b", marginTop: 8 }}>
            Your programme is enrolled, but course modules have not been published. Academic staff
            will release content for your intake.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {courses.map((course: any) => (
            <article key={course.id} className="campus-card">
              <p className="eyebrow">Course</p>
              <h3 style={{ margin: "6px 0 8px", fontSize: 18 }}>
                {course.title || course.name || course.code}
              </h3>
              {course.description && (
                <p style={{ color: "#64748b", fontSize: 14 }}>{course.description}</p>
              )}
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                {(course.modules || []).length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 14 }}>
                    No modules published for this course yet.
                  </p>
                ) : (
                  (course.modules || []).map((mod: any) => (
                    <div
                      key={mod.id}
                      style={{
                        border: "1px solid #e6eaf2",
                        borderRadius: 12,
                        padding: 14,
                        background: "#f8fafc",
                      }}
                    >
                      <strong>{mod.title}</strong>
                      <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                        {(mod.lessons || []).map((lesson: any) => {
                          const done = progress.get(lesson.id);
                          return (
                            <li key={lesson.id} style={{ marginBottom: 6 }}>
                              {canAccessFull ? (
                                <Link href={`/student/learn/${lesson.id}`}>
                                  {done ? "✓ " : ""}
                                  {lesson.title}
                                </Link>
                              ) : (
                                <span>
                                  {done ? "✓ " : ""}
                                  {lesson.title}{" "}
                                  <span style={{ color: "#94a3b8" }}>(locked)</span>
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
