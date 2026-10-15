import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { updateProgrammeAction, publishProgrammeAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ programmeId: string }>;
}) {
  const { programmeId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const db = getDb();
  if (!db) return <p className="p-8">Database unavailable.</p>;

  const p = await db.programme.findUnique({
    where: { id: programmeId },
    include: { rules: true },
  });
  if (!p) redirect("/staff/academic");

  const r = p.rules;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <Link href="/staff/academic" className="text-xs text-emerald-700 hover:underline">
              ← Programmes
            </Link>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{p.name}</h1>
            <p className="text-sm text-slate-500">
              {p.code} · {p.status}
              {p.applicationsOpen ? " · applications open" : " · applications closed"}
            </p>
          </div>
          {p.status !== "PUBLISHED" && (
            <form action={publishProgrammeAction}>
              <input type="hidden" name="programmeId" value={p.id} />
              <input type="hidden" name="openApplications" value="true" />
              <button
                type="submit"
                className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800"
              >
                Publish & open
              </button>
            </form>
          )}
        </div>
      </header>

      <form action={updateProgrammeAction} className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <input type="hidden" name="programmeId" value={p.id} />
        <input type="hidden" name="code" value={p.code} />

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Identity</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Name *</span>
            <input name="name" required defaultValue={p.name} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Short name</span>
            <input name="shortName" defaultValue={p.shortName || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Description</span>
            <textarea name="description" rows={3} defaultValue={p.description || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">Duration (months)</span>
              <input name="durationMonths" type="number" min={1} defaultValue={p.durationMonths} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Award title</span>
              <input name="awardTitle" defaultValue={p.awardTitle || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Delivery mode</span>
              <select name="deliveryMode" defaultValue={p.deliveryMode || "ONLINE"} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="ONLINE">Online</option>
                <option value="ONSITE">On-site</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Intake label</span>
              <input name="intakeLabel" defaultValue={p.intakeLabel || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Next start date</span>
              <input
                name="nextStartDate"
                type="date"
                defaultValue={p.nextStartDate ? p.nextStartDate.toISOString().slice(0, 10) : ""}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Status</span>
              <select name="status" defaultValue={p.status} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="applicationsOpen" defaultChecked={p.applicationsOpen} />
            Applications open
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Fees</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-slate-600">Application fee</span>
              <input name="applicationFee" type="number" min={0} defaultValue={Number(p.applicationFee)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Tuition fee</span>
              <input name="tuitionFee" type="number" min={0} defaultValue={Number(p.tuitionFee)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Currency</span>
              <input name="currency" defaultValue={p.currency} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Academic & access rules</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-slate-600">Pass mark %</span>
              <input name="passMarkPercent" type="number" defaultValue={Number(r?.passMarkPercent ?? 50)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Min. attendance %</span>
              <input name="attendanceMinimumPercent" type="number" defaultValue={Number(r?.attendanceMinimumPercent ?? 70)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Exam attempts</span>
              <input name="examAttemptsAllowed" type="number" defaultValue={Number(r?.examAttemptsAllowed ?? 3)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Assignment weight %</span>
              <input name="assignmentWeightPercent" type="number" defaultValue={Number(r?.assignmentWeightPercent ?? 30)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Quiz weight %</span>
              <input name="quizWeightPercent" type="number" defaultValue={Number(r?.quizWeightPercent ?? 20)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Exam weight %</span>
              <input name="examWeightPercent" type="number" defaultValue={Number(r?.examWeightPercent ?? 50)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Learning access at % paid</span>
              <input name="activationPaymentPercent" type="number" defaultValue={Number(r?.activationPaymentPercent ?? 60)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Exam clearance at % paid</span>
              <input name="examPaymentClearancePercent" type="number" defaultValue={Number(r?.examPaymentClearancePercent ?? 100)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <label className="block text-sm">
            <span className="text-slate-600">Entry requirements</span>
            <textarea name="entryRequirements" rows={2} defaultValue={p.entryRequirements || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Learning outcomes</span>
            <textarea name="learningOutcomes" rows={2} defaultValue={p.learningOutcomes || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </section>

        <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800">
          Save changes
        </button>
      </form>
    </div>
  );
}
