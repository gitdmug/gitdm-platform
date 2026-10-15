import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { listUpcomingClasses, studentCheckIn } from "@/lib/attendance";

export const dynamic = "force-dynamic";

async function checkInAction(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const eventId = String(formData.get("eventId") || "");
  const result = await studentCheckIn({ eventId, userId: user.id });
  if (result.meetUrl) {
    redirect(result.meetUrl);
  }
  redirect(`/student/classes?checkedIn=${eventId}`);
}

export default async function StudentClassesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/classes");

  const classes = await listUpcomingClasses(user.id);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Live classes</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Timetable</h1>
            <p className="mt-1 text-sm text-slate-500">
              Check in through GITDM before joining Google Meet so attendance is recorded.
            </p>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {classes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No upcoming classes scheduled for your programme.
          </div>
        ) : (
          <ul className="space-y-4">
            {classes.map((ev: any) => {
              const att = ev.attendance?.[0];
              const start = new Date(ev.startAt);
              const end = new Date(ev.endAt);
              const now = new Date();
              const canJoin =
                now >= new Date(start.getTime() - 30 * 60 * 1000) &&
                now <= new Date(end.getTime() + 15 * 60 * 1000);

              return (
                <li
                  key={ev.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-slate-900">{ev.title}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {ev.course?.title || "Class"} ·{" "}
                        {start.toLocaleString("en-GB", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {end.toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {att && (
                        <p className="mt-1 text-xs text-emerald-700">
                          Checked in
                          {att.minutesAttended ? ` · ${att.minutesAttended} min` : ""}
                        </p>
                      )}
                    </div>
                    {canJoin && (ev.googleMeetUrl || ev.joinUrl) && (
                      <form action={checkInAction}>
                        <input type="hidden" name="eventId" value={ev.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                        >
                          {att ? "Rejoin Meet" : "Check in & join"}
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </main>
  );
}
