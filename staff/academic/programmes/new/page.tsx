import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { createProgrammeAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProgrammePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          <Link href="/staff/academic" className="text-xs text-emerald-700 hover:underline">
            ← Programmes
          </Link>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">Create programme</h1>
          <p className="mt-1 text-sm text-slate-500">
            This becomes the source of truth for public pages, applications, fees and access rules.
          </p>
        </div>
      </header>

      <form action={createProgrammeAction} className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">Code *</span>
              <input name="code" required placeholder="GITDM-TA1M" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Duration (months) *</span>
              <input name="durationMonths" type="number" min={1} required defaultValue={1} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-slate-600">Name *</span>
            <input name="name" required placeholder="Technical Analysis" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Short name</span>
            <input name="shortName" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Description</span>
            <textarea name="description" rows={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Award title</span>
            <input name="awardTitle" placeholder="Certificate in Technical Analysis" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-slate-600">Delivery mode</span>
              <select name="deliveryMode" defaultValue="ONLINE" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
                <option value="ONLINE">Online</option>
                <option value="ONSITE">On-site</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Intake label</span>
              <input name="intakeLabel" placeholder="November 2026" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-slate-600">Next start date</span>
            <input name="nextStartDate" type="date" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Fees (UGX)</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-slate-600">Application fee</span>
              <input name="applicationFee" type="number" min={0} defaultValue={10000} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Tuition fee</span>
              <input name="tuitionFee" type="number" min={0} defaultValue={0} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Currency</span>
              <input name="currency" defaultValue="UGX" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Academic & access rules</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-slate-600">Pass mark %</span>
              <input name="passMarkPercent" type="number" min={0} max={100} defaultValue={50} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Min. attendance %</span>
              <input name="attendanceMinimumPercent" type="number" min={0} max={100} defaultValue={70} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Exam attempts</span>
              <input name="examAttemptsAllowed" type="number" min={1} defaultValue={3} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Assignment weight %</span>
              <input name="assignmentWeightPercent" type="number" min={0} max={100} defaultValue={30} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Quiz weight %</span>
              <input name="quizWeightPercent" type="number" min={0} max={100} defaultValue={20} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Exam weight %</span>
              <input name="examWeightPercent" type="number" min={0} max={100} defaultValue={50} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Learning access at % paid</span>
              <input name="activationPaymentPercent" type="number" min={0} max={100} defaultValue={60} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              <span className="text-slate-600">Exam clearance at % paid</span>
              <input name="examPaymentClearancePercent" type="number" min={0} max={100} defaultValue={100} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Publishing</h2>
          <label className="block text-sm">
            <span className="text-slate-600">Initial status</span>
            <select name="status" defaultValue="DRAFT" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2">
              <option value="DRAFT">Draft (not public)</option>
              <option value="PUBLISHED">Published (visible on public pages)</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="applicationsOpen" />
            Open for applications immediately
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Entry requirements</span>
            <textarea name="entryRequirements" rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">Learning outcomes</span>
            <textarea name="learningOutcomes" rows={2} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
        </section>

        <div className="flex gap-3">
          <button type="submit" className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800">
            Create programme
          </button>
          <Link href="/staff/academic" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
