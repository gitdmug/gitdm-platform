import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { GITDM } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default async function StudentIdCardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/id-card");

  const db = getDb();
  if (!db) return <p className="p-8">Unavailable</p>;

  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: user.id,
      status: { in: ["ACTIVE", "PENDING", "REPEATING", "COMPLETED"] },
    },
    include: {
      programme: { select: { name: true, code: true, awardTitle: true } },
      period: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const profile = await db.profile.findUnique({ where: { userId: user.id } });
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
        <div className="mb-6 flex justify-between print:hidden">
          <div>
            <p className="text-sm font-medium text-emerald-700">Student portal</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Student ID</h1>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg print:shadow-none">
          <div className="bg-emerald-900 px-6 py-4 text-white">
            <p className="text-xs uppercase tracking-widest text-emerald-200/90">
              {GITDM.shortName || "GITDM"}
            </p>
            <p className="mt-1 text-sm font-medium">
              {GITDM.name || "Global Institute of Trading and Derivatives Markets"}
            </p>
          </div>
          <div className="flex gap-4 px-6 py-6">
            <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl font-semibold text-slate-400">
              {profile?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    profile.avatarUrl.startsWith("neonfile:")
                      ? "/api/campus/files/profile"
                      : profile.avatarUrl
                  }
                  alt=""
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-slate-900">{name}</p>
              <p className="mt-1 font-mono text-sm text-emerald-800">
                {enrollment?.studentNumber || "Pending number"}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {enrollment?.programme.name || "No programme"}
              </p>
              {enrollment?.period?.name && (
                <p className="text-xs text-slate-500">{enrollment.period.name}</p>
              )}
              <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
                {enrollment?.status || "—"} · {enrollment?.accessLevel || "—"}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
            {GITDM.location || "Kampala, Uganda"} · Valid while enrolment is active
          </div>
        </div>

        <p className="mt-6 text-center text-sm print:hidden">
          <a href="javascript:window.print()" className="text-emerald-700 hover:underline">
            Print ID card
          </a>
        </p>
      </div>
      </main>
  );
}
