import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function markAllRead() {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const db = getDb();
  if (!db) return;
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  redirect("/student/notifications");
}

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/notifications");

  const db = getDb();
  const notifications = db
    ? await db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Account</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Notifications</h1>
            {unread > 0 && (
              <p className="mt-1 text-sm text-slate-500">{unread} unread</p>
            )}
          </div>
          <div className="flex gap-3">
            {unread > 0 && (
              <form action={markAllRead}>
                <button type="submit" className="text-sm text-emerald-700 hover:underline">
                  Mark all read
                </button>
              </form>
            )}
            <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
              ← Portal
            </Link>
          </div>
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications yet.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`rounded-xl border p-4 ${
                  n.readAt
                    ? "border-slate-200 bg-white"
                    : "border-emerald-100 bg-emerald-50/40"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">{n.body}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{n.type}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
  );
}
