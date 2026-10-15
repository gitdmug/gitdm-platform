import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { listUpcomingClasses } from "@/lib/attendance";
import { createModule, createLesson, publishLesson, createAssignment } from "@/lib/lms";
import { scheduleClass, setMeetLink, reconcileMeetAttendance } from "@/lib/attendance";

export const dynamic = "force-dynamic";

async function createModuleAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await createModule({
    courseId: String(formData.get("courseId") || ""),
    title: String(formData.get("title") || ""),
    description: String(formData.get("description") || "") || undefined,
    actorId: user.id,
  });
  redirect("/staff/lecturer?module=1");
}

async function createLessonAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const lesson = await createLesson({
    moduleId: String(formData.get("moduleId") || ""),
    title: String(formData.get("title") || ""),
    type: String(formData.get("type") || "ARTICLE"),
    content: String(formData.get("content") || "") || undefined,
    videoUrl: String(formData.get("videoUrl") || "") || undefined,
    actorId: user.id,
  });
  if (formData.get("publish") === "on") {
    await publishLesson(lesson.id, user.id);
  }
  redirect("/staff/lecturer?lesson=1");
}

async function scheduleClassAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await scheduleClass({
    courseId: String(formData.get("courseId") || ""),
    title: String(formData.get("title") || ""),
    startAt: new Date(String(formData.get("startAt"))),
    endAt: new Date(String(formData.get("endAt"))),
    lecturerUserId: user.id,
    notes: String(formData.get("notes") || "") || undefined,
    scheduledById: user.id,
    createMeet: formData.get("createMeet") === "on",
  });
  redirect("/staff/lecturer?class=1");
}

async function setMeetAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await setMeetLink({
    eventId: String(formData.get("eventId") || ""),
    meetUrl: String(formData.get("meetUrl") || ""),
    actorId: user.id,
  });
  redirect("/staff/lecturer?meet=1");
}

async function reconcileAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await reconcileMeetAttendance(String(formData.get("eventId") || ""));
  redirect("/staff/lecturer?reconciled=1");
}

async function createAssignmentAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  await createAssignment({
    courseId: String(formData.get("courseId") || ""),
    title: String(formData.get("title") || ""),
    instructions: String(formData.get("instructions") || ""),
    maxMarks: Number(formData.get("maxMarks") || 100),
    dueAt: formData.get("dueAt") ? new Date(String(formData.get("dueAt"))) : null,
    actorId: user.id,
    publish: formData.get("publish") === "on",
  });
  redirect("/staff/lecturer?assignment=1");
}

export default async function LecturerWorkspacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/lecturer");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["LECTURER", "FACULTY", "ACADEMIC_DIRECTOR", "PRINCIPAL", "ONLINE_INSTRUCTOR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  if (!db) return <p className="p-8">Database unavailable.</p>;

  // Courses where user is faculty, or all published if academic director
  const isDirector = roleCodes.some((c: string) =>
    ["ACADEMIC_DIRECTOR", "PRINCIPAL"].includes(c)
  );
  const courses = await db.course.findMany({
    where: isDirector
      ? { published: true }
      : { faculty: { some: { userId: user.id } }, published: true },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: { lessons: { orderBy: { orderIndex: "asc" } } },
      },
      programme: { select: { name: true } },
      assignments: { orderBy: { dueAt: "desc" }, take: 5 },
    },
    orderBy: { title: "asc" },
  });

  const classes = await listUpcomingClasses(user.id, { lecturer: true });

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · Lecturer
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Teaching workspace</h1>
            <Link href="/staff/lecturer/marking" className="mt-1 block text-sm text-emerald-700 hover:underline">
              Assignment marking →
            </Link>
            <Link href="/staff/lecturer/content" className="mt-1 block text-sm text-emerald-700 hover:underline">
              Content builder →
            </Link>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6">
        {/* Upcoming classes */}
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Upcoming classes</h2>
          {classes.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No upcoming classes assigned to you.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {classes.map((ev: any) => (
                <li key={ev.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{ev.title}</p>
                      <p className="text-xs text-slate-500">
                        {ev.course?.title} · {new Date(ev.startAt).toLocaleString("en-GB")} ·{" "}
                        {ev.attendance?.length || 0} check-ins
                      </p>
                      {ev.googleMeetUrl && (
                        <a
                          href={ev.googleMeetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-emerald-700 hover:underline"
                        >
                          Open Meet
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {!ev.googleMeetUrl && (
                        <form action={setMeetAction} className="flex gap-1">
                          <input type="hidden" name="eventId" value={ev.id} />
                          <input
                            name="meetUrl"
                            required
                            placeholder="Meet URL"
                            className="w-48 rounded border border-slate-200 px-2 py-1 text-xs"
                          />
                          <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
                            Save
                          </button>
                        </form>
                      )}
                      <form action={reconcileAction}>
                        <input type="hidden" name="eventId" value={ev.id} />
                        <button type="submit" className="text-xs text-slate-600 hover:underline">
                          Reconcile Meet attendance
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Schedule class */}
        {courses.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Schedule a class</h2>
            <form action={scheduleClassAction} className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm sm:col-span-2">
                <span className="text-slate-600">Course</span>
                <select name="courseId" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.programme?.name || "—"})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="text-slate-600">Title</span>
                <input name="title" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Start</span>
                <input name="startAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">End</span>
                <input name="endAt" type="datetime-local" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="createMeet" defaultChecked />
                Create Google Meet link (if configured)
              </label>
              <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 sm:col-span-2">
                Schedule
              </button>
            </form>
          </section>
        )}

        {/* Courses / modules / lessons */}
        {courses.map((course) => (
          <section key={course.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">{course.title}</h2>
            <p className="text-xs text-slate-500">{course.programme?.name}</p>

            <div className="mt-4 space-y-3">
              {course.modules.map((mod) => (
                <div key={mod.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="text-sm font-medium text-slate-800">
                    {mod.title}{" "}
                    <span className="text-xs text-slate-400">
                      {mod.published ? "published" : "draft"} · {mod.lessons.length} lessons
                    </span>
                  </p>
                  <ul className="mt-1 text-xs text-slate-600">
                    {mod.lessons.map((l) => (
                      <li key={l.id}>
                        {l.title} {l.published ? "✓" : "(draft)"}
                      </li>
                    ))}
                  </ul>
                  <form action={createLessonAction} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="moduleId" value={mod.id} />
                    <input name="title" required placeholder="New lesson title" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                    <select name="type" className="rounded border border-slate-200 px-2 py-1 text-xs">
                      <option value="ARTICLE">Article</option>
                      <option value="VIDEO">Video</option>
                      <option value="DOCUMENT">Document</option>
                      <option value="LIVE_SESSION">Live session</option>
                    </select>
                    <input name="videoUrl" placeholder="Video URL" className="rounded border border-slate-200 px-2 py-1 text-xs" />
                    <label className="flex items-center gap-1 text-xs">
                      <input type="checkbox" name="publish" /> Publish
                    </label>
                    <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
                      Add lesson
                    </button>
                  </form>
                </div>
              ))}
            </div>

            <form action={createModuleAction} className="mt-3 flex flex-wrap gap-2">
              <input type="hidden" name="courseId" value={course.id} />
              <input name="title" required placeholder="New module title" className="rounded border border-slate-200 px-2 py-1 text-sm" />
              <button type="submit" className="rounded bg-slate-800 px-3 py-1 text-xs text-white">
                Add module
              </button>
            </form>

            <form action={createAssignmentAction} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-600">New assignment</p>
              <input type="hidden" name="courseId" value={course.id} />
              <input name="title" required placeholder="Title" className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
              <textarea name="instructions" required placeholder="Instructions" rows={2} className="w-full rounded border border-slate-200 px-2 py-1 text-sm" />
              <div className="flex flex-wrap gap-2">
                <input name="maxMarks" type="number" defaultValue={100} className="w-24 rounded border border-slate-200 px-2 py-1 text-sm" />
                <input name="dueAt" type="datetime-local" className="rounded border border-slate-200 px-2 py-1 text-sm" />
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="publish" defaultChecked /> Publish
                </label>
                <button type="submit" className="rounded bg-emerald-700 px-3 py-1 text-xs text-white">
                  Create assignment
                </button>
              </div>
            </form>
          </section>
        ))}

        {courses.length === 0 && (
          <p className="text-sm text-slate-500">
            No courses assigned. Academic Director should allocate you to a published course.
          </p>
        )}
      </div>
    </div>
  );
}
