"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/access";
import { createProgramme, updateProgramme, publishProgramme } from "@/lib/programme-wizard";

async function assertAcademicStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["PRINCIPAL", "ACADEMIC_DIRECTOR", "FACULTY", "CURRICULUM_DEVELOPER"].includes(c)
  );
  if (!allowed) throw new Error("You do not have permission to manage programmes.");
  return user;
}

function formToInput(formData: FormData) {
  const num = (key: string) => {
    const v = formData.get(key);
    if (v === null || v === "") return undefined;
    return Number(v);
  };
  const str = (key: string) => {
    const v = String(formData.get(key) || "").trim();
    return v || undefined;
  };
  const bool = (key: string) => formData.get(key) === "on" || formData.get(key) === "true";

  return {
    code: str("code") || "",
    name: str("name") || "",
    shortName: str("shortName"),
    description: str("description"),
    durationMonths: num("durationMonths") || 1,
    applicationFee: num("applicationFee"),
    tuitionFee: num("tuitionFee"),
    currency: str("currency") || "UGX",
    applicationsOpen: bool("applicationsOpen"),
    requiresApplication: formData.get("requiresApplication") !== "false",
    nextStartDate: str("nextStartDate") || null,
    intakeLabel: str("intakeLabel"),
    awardTitle: str("awardTitle"),
    deliveryMode: str("deliveryMode") || "ONLINE",
    entryRequirements: str("entryRequirements"),
    learningOutcomes: str("learningOutcomes"),
    passMarkPercent: num("passMarkPercent"),
    attendanceMinimumPercent: num("attendanceMinimumPercent"),
    assignmentWeightPercent: num("assignmentWeightPercent"),
    quizWeightPercent: num("quizWeightPercent"),
    examWeightPercent: num("examWeightPercent"),
    activationPaymentPercent: num("activationPaymentPercent"),
    examPaymentClearancePercent: num("examPaymentClearancePercent"),
    examAttemptsAllowed: num("examAttemptsAllowed"),
    status: (str("status") as "DRAFT" | "PUBLISHED" | "ARCHIVED") || "DRAFT",
  };
}

export async function createProgrammeAction(formData: FormData) {
  const user = await assertAcademicStaff();
  const input = formToInput(formData);
  const programme = await createProgramme(input, user.id);
  revalidatePath("/staff/academic");
  revalidatePath("/programmes");
  revalidatePath("/admissions");
  revalidatePath("/admissions/apply");
  redirect(`/staff/academic/programmes/${programme.id}?created=1`);
}

export async function updateProgrammeAction(formData: FormData) {
  const user = await assertAcademicStaff();
  const programmeId = String(formData.get("programmeId") || "");
  if (!programmeId) throw new Error("Missing programme id.");
  const input = formToInput(formData);
  await updateProgramme(programmeId, input, user.id);
  revalidatePath("/staff/academic");
  revalidatePath(`/staff/academic/programmes/${programmeId}`);
  revalidatePath("/programmes");
  revalidatePath("/admissions");
  revalidatePath("/admissions/apply");
  redirect(`/staff/academic/programmes/${programmeId}?saved=1`);
}

export async function publishProgrammeAction(formData: FormData) {
  const user = await assertAcademicStaff();
  const programmeId = String(formData.get("programmeId") || "");
  const openApps = formData.get("openApplications") !== "false";
  await publishProgramme(programmeId, user.id, openApps);
  revalidatePath("/staff/academic");
  revalidatePath("/programmes");
  revalidatePath("/admissions");
  revalidatePath("/admissions/apply");
  redirect(`/staff/academic/programmes/${programmeId}?published=1`);
}
