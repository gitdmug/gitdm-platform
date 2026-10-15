import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { listUpcomingClasses } from "@/lib/attendance";
import { getStudentLearningContext } from "@/lib/lms";

export const dynamic = "force-dynamic";

export default async function StudentCalendarPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/calendar");

  const classes = await listUpcomingClasses(user.id);
  const ctx = await getStudentLearningContext(user.id);
  const db = getDb();

  let assignments: any[] = [];
  let exams: any[] = [];
  if (db && ctx) {
    const courseIds = ctx.enrollment.programme.courses.map((c) => c.id);
    assignments = await db.assignment.findMany({
      where: {
        courseId: { in: courseIds },
        status: "PUBLISHED",
        dueAt: { gte: new Date() },
      },
      include: { course: { select: { title: true } } },
      orderBy: { dueAt: "asc" },
      take: 20,
    });
    exams = await db.exam.findMany({
      where: {
        courseId: { in: courseIds },
        status: "PUBLISHED",
        OR: [
          { opensAt: { gte: new Date() } },
          { closesAt: { gte: new Date() } },
        ],
      },
      include: { course: { select: { title: true } } },
      orderBy: { opensAt: "asc" },
      take: 20,
    });
  }

  type Item = { at: Date; label: string; detail: string; href?: string };
  const items: Item[] = [];

  for (const ev of classes as any[]) {
    items.push({
      at: new Date(ev.startAt),
      label: "Class",
      detail: `${ev.title} · ${ev.course?.title || ""}`,
      href: "/student/classes",
    });
  }
  for (const a of assignments) {
    if (a.dueAt) {
      items.push({
        at: new Date(a.dueAt),
        label: "Assignment due",
        detail: `${a.title} · ${a.course.title}`,
        href: "/student/assignments",
      });
    }
  }
  for (const e of exams) {
    items.push({
      at: new Date(e.opensAt || e.closesAt),
      label: "Exam",
      detail: `${e.title} · ${e.course.title}`,
      href: `/student/exams/${e.id}`,
    });
  }

  items.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Student portal</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Academic calendar</h1>
            <p className="mt-1 text-sm text-slate-500">
              Upcoming classes, assignment deadlines and exams
            </p>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing scheduled in the next period.</p>
        ) : (
          <ol className="relative space-y-0 border-l border-slate-200 ml-3">
            {items.map((item, i) => (
              <li key={i} className="mb-6 ml-6">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-white bg-emerald-600" />
                <time className="text-xs font-medium text-slate-500">
                  {item.at.toLocaleString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                <p className="text-xs uppercase tracking-wide text-emerald-700">{item.label}</p>
                <p className="font-medium text-slate-900">{item.detail}</p>
                {item.href && (
                  <Link href={item.href} className="text-sm text-emerald-700 hover:underline">
                    Open →
                  </Link>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
      </main>
  );
}
