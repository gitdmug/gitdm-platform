import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { isGoogleWorkspaceConfigured } from "@/lib/google-workspace";

export const dynamic = "force-dynamic";

function envStatus(name: string) {
  const v = process.env[name]?.trim();
  return v ? "Configured" : "Missing";
}

export default async function ITPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff/it");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["IT", "CTO_IT_DIRECTOR", "PRINCIPAL", "LMS_ADMINISTRATOR"].includes(c)
  );
  if (!allowed) redirect("/dashboard");

  const db = getDb();
  let dbOk = false;
  try {
    if (db) {
      await db.$queryRaw`SELECT 1`;
      dbOk = true;
    }
  } catch {
    dbOk = false;
  }

  const checks = [
    { name: "PostgreSQL (Neon)", status: dbOk ? "Connected" : "Unavailable" },
    { name: "DATABASE_URL", status: envStatus("DATABASE_URL") },
    { name: "Neon Auth base URL", status: envStatus("NEON_AUTH_BASE_URL") },
    { name: "Object storage (S3)", status: envStatus("AWS_ENDPOINT_URL_S3") },
    { name: "Resend email", status: envStatus("RESEND_API_KEY") },
    {
      name: "Pesapal",
      status:
        process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_IPN_ID
          ? `Configured (${process.env.PESAPAL_ENV || "SANDBOX"})`
          : "Incomplete",
    },
    {
      name: "Google Workspace / Meet",
      status: isGoogleWorkspaceConfigured() ? "Configured" : "Not configured",
    },
    { name: "App URL", status: process.env.NEXT_PUBLIC_APP_URL || "default" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Staff · IT
            </p>
            <h1 className="text-xl font-semibold text-slate-900">System health</h1>
            <p className="text-sm text-slate-500">
              Integration status only — secrets are never displayed
            </p>
          </div>
          <Link href="/staff" className="text-sm text-slate-600 hover:text-slate-900">
            ← Control Centre
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {checks.map((c) => (
            <li key={c.name} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="font-medium text-slate-800">{c.name}</span>
              <span
                className={
                  c.status.startsWith("Connected") ||
                  c.status.startsWith("Configured")
                    ? "text-emerald-700"
                    : c.status === "Missing" || c.status === "Unavailable" || c.status === "Incomplete"
                    ? "text-amber-700"
                    : "text-slate-600"
                }
              >
                {c.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Platform version {process.env.npm_package_version || "1.7+"} · Node runtime on Vercel
        </p>
      </div>
    </div>
  );
}
