import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";

export const dynamic = "force-dynamic";

const WORKSPACES = [
  { href: "/staff/principal", label: "Leadership", desc: "Institutional overview & audit", roles: ["PRINCIPAL", "ACADEMIC_DIRECTOR"] },
  { href: "/staff/admissions", label: "Admissions", desc: "Applications, fees, decisions", roles: ["ADMISSIONS", "PRINCIPAL", "REGISTRAR", "ADMISSIONS_DIRECTOR", "ADMISSIONS_COUNSELOR"] },
  { href: "/staff/finance", label: "Finance", desc: "Invoices, verification, clearance", roles: ["FINANCE", "PRINCIPAL", "BURSAR_BILLING_SPECIALIST"] },
  { href: "/staff/registrar", label: "Registrar", desc: "Student records & progression", roles: ["REGISTRAR", "PRINCIPAL", "ACADEMIC_DIRECTOR"] },
  { href: "/staff/academic", label: "Academic", desc: "Programmes, rules, curriculum", roles: ["ACADEMIC_DIRECTOR", "FACULTY", "PRINCIPAL", "CURRICULUM_DEVELOPER"] },
  { href: "/staff/lecturer", label: "Lecturer", desc: "Lessons, classes, assignments", roles: ["LECTURER", "FACULTY", "ACADEMIC_DIRECTOR", "PRINCIPAL", "ONLINE_INSTRUCTOR"] },
  { href: "/staff/exams", label: "Exams & awards", desc: "Assessments, certificates", roles: ["EXAM_OFFICER", "ACADEMIC_DIRECTOR", "PRINCIPAL", "REGISTRAR", "LECTURER"] },
  { href: "/staff/student-affairs", label: "Student Affairs", desc: "Support tickets & welfare", roles: ["STUDENT_AFFAIRS", "PRINCIPAL"] },
  { href: "/staff/library", label: "Library", desc: "Resources catalogue", roles: ["LIBRARY", "PRINCIPAL", "ACADEMIC_DIRECTOR"] },
  { href: "/staff/marketing", label: "Marketing", desc: "Announcements", roles: ["MARKETING", "PRINCIPAL", "ADMISSIONS"] },
  { href: "/staff/hr", label: "HR / Invites", desc: "Staff invitations", roles: ["PRINCIPAL", "REGISTRAR", "IT", "CTO_IT_DIRECTOR"] },
  { href: "/staff/it", label: "IT", desc: "System health & integrations", roles: ["IT", "CTO_IT_DIRECTOR", "PRINCIPAL", "LMS_ADMINISTRATOR"] },
];

export default async function StaffHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/staff");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const visible = WORKSPACES.filter((w) => w.roles.some((r) => roleCodes.includes(r)));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Staff Control Centre</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Welcome{user.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Select a workspace</p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {visible.length === 0 ? (
          <p className="text-slate-600">No workspaces assigned to your roles yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow"
              >
                <h2 className="font-semibold text-slate-900">{w.label}</h2>
                <p className="mt-1 text-sm text-slate-500">{w.desc}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
