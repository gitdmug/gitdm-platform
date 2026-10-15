import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function AlumniPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/alumni");

  const db = getDb();
  if (!db) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-600">
          Service unavailable.
        </div>
        <Footer />
      </main>
    );
  }

  const completed = await db.enrollment.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    include: { programme: true },
    orderBy: { completedAt: "desc" },
  });

  const certificates = await db.certificate.findMany({
    where: { userId: user.id, status: "ISSUED" },
    include: { programme: true },
    orderBy: { issuedAt: "desc" },
  });

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const isAlumni =
    roleCodes.includes("ALUMNI") || completed.length > 0 || certificates.length > 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-sm font-medium text-emerald-700">Alumni</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Welcome{user.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Your completed programmes, certificates, and verification links.
        </p>

        {!isAlumni && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            No completed programmes on record yet.{" "}
            <Link href="/student" className="text-emerald-700 hover:underline">
              Student portal
            </Link>
          </div>
        )}

        {completed.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900">Completed programmes</h2>
            <ul className="mt-3 space-y-2">
              {completed.map((e) => (
                <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-medium text-slate-900">{e.programme.name}</p>
                  <p className="text-xs text-slate-500">
                    Completed{" "}
                    {e.completedAt
                      ? new Date(e.completedAt).toLocaleDateString("en-GB")
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {certificates.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold text-slate-900">Certificates</h2>
            <ul className="mt-3 space-y-2">
              {certificates.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="font-medium text-slate-900">{c.programme.name}</p>
                  <p className="font-mono text-xs text-slate-500">{c.number}</p>
                  <Link
                    href={`/verify/${c.number}`}
                    className="mt-2 inline-block text-sm text-emerald-700 hover:underline"
                  >
                    Public verification
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-10 text-sm">
          <Link href="/dashboard" className="text-emerald-700 hover:underline">
            ← Dashboard
          </Link>
        </p>
      </div>
      <Footer />
    </main>
  );
}
