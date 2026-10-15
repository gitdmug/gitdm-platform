import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

async function saveProfile(formData: FormData) {
  "use server";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const firstName = String(formData.get("firstName") || "").trim() || null;
  const lastName = String(formData.get("lastName") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;

  await db.user.update({
    where: { id: user.id },
    data: { firstName, lastName, phone },
  });

  const profileData = {
    dateOfBirth: formData.get("dateOfBirth")
      ? new Date(String(formData.get("dateOfBirth")))
      : null,
    gender: String(formData.get("gender") || "").trim() || null,
    nationality: String(formData.get("nationality") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    city: String(formData.get("city") || "").trim() || null,
    country: String(formData.get("country") || "Uganda").trim() || "Uganda",
    emergencyName: String(formData.get("emergencyName") || "").trim() || null,
    emergencyPhone: String(formData.get("emergencyPhone") || "").trim() || null,
  };

  await db.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...profileData },
    update: profileData,
  });

  redirect("/student/profile?saved=1");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/student/profile");
  const sp = await searchParams;

  const db = getDb();
  const profile = db
    ? await db.profile.findUnique({ where: { userId: user.id } })
    : null;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">Account</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Profile</h1>
          </div>
          <Link href="/student" className="text-sm text-slate-600 hover:text-slate-900">
            ← Portal
          </Link>
        </div>

        {sp.saved && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Profile saved.
          </div>
        )}

        <form action={saveProfile} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs text-slate-500">Email (read-only): {user.email}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              First name
              <input name="firstName" defaultValue={user.firstName || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              Last name
              <input name="lastName" defaultValue={user.lastName || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            Phone
            <input name="phone" defaultValue={user.phone || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            Date of birth
            <input
              name="dateOfBirth"
              type="date"
              defaultValue={
                profile?.dateOfBirth
                  ? profile.dateOfBirth.toISOString().slice(0, 10)
                  : ""
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Gender
              <input name="gender" defaultValue={profile?.gender || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              Nationality
              <input name="nationality" defaultValue={profile?.nationality || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            Address
            <input name="address" defaultValue={profile?.address || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              City
              <input name="city" defaultValue={profile?.city || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
            <label className="block text-sm">
              Country
              <input name="country" defaultValue={profile?.country || "Uganda"} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm">
            Emergency contact name
            <input name="emergencyName" defaultValue={profile?.emergencyName || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <label className="block text-sm">
            Emergency contact phone
            <input name="emergencyPhone" defaultValue={profile?.emergencyPhone || ""} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Save profile
          </button>
        </form>
      </div>
      </main>
  );
}
