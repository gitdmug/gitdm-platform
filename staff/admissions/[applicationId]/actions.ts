"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import {
  assertFeeSettledBeforeDecision,
  completeEnrolmentHandover,
  advanceAfterFeePayment,
} from "@/lib/admissions-workflow";

async function assertAdmissionsStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed =
    roleCodes.includes("PRINCIPAL") ||
    roleCodes.includes("ADMISSIONS") ||
    roleCodes.includes("ADMISSIONS_DIRECTOR") ||
    roleCodes.includes("ADMISSIONS_COUNSELOR") ||
    roleCodes.includes("REGISTRAR");
  if (!allowed) throw new Error("You do not have permission to perform admissions actions.");
  return user;
}

export async function decideApplication(formData: FormData) {
  const user = await assertAdmissionsStaff();
  const applicationId = String(formData.get("applicationId") || "");
  const decision = String(formData.get("decision") || "") as "ACCEPTED" | "REJECTED" | "CONDITIONAL";
  const reason = String(formData.get("reason") || "").trim() || undefined;

  if (!["ACCEPTED", "REJECTED", "CONDITIONAL"].includes(decision)) {
    throw new Error("Invalid decision type.");
  }

  await assertFeeSettledBeforeDecision(applicationId);
  await completeEnrolmentHandover({
    applicationId,
    decidedById: user.id,
    decisionType: decision,
    reason,
  });

  revalidatePath(`/staff/admissions/${applicationId}`);
  revalidatePath("/staff/admissions");
  redirect(`/staff/admissions/${applicationId}?decided=1`);
}

export async function waiveApplicationFee(formData: FormData) {
  const user = await assertAdmissionsStaff();
  const applicationId = String(formData.get("applicationId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (!reason) throw new Error("A waiver reason is required.");

  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const invoice = await db.invoice.findFirst({
    where: { applicationId, kind: "APPLICATION_FEE" },
  });
  if (!invoice) throw new Error("No application fee invoice found.");

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      waived: true,
      waiverReason: reason,
      waivedById: user.id,
      waivedAt: new Date(),
      status: "PAID",
    },
  });

  await advanceAfterFeePayment(applicationId);

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "APPLICATION_FEE_WAIVED",
      entity: "Invoice",
      entityId: invoice.id,
      metadataJson: JSON.stringify({ applicationId, reason }),
    },
  });

  revalidatePath(`/staff/admissions/${applicationId}`);
  redirect(`/staff/admissions/${applicationId}?waived=1`);
}

export async function requestAdditionalInfo(formData: FormData) {
  const user = await assertAdmissionsStaff();
  const applicationId = String(formData.get("applicationId") || "");
  const note = String(formData.get("note") || "").trim();
  if (!note) throw new Error("Please describe what is required.");

  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const app = await db.application.update({
    where: { id: applicationId },
    data: { status: "ADDITIONAL_INFORMATION", notes: note },
    include: { applicant: true, programme: true },
  });

  await db.notification.create({
    data: {
      userId: app.applicantId,
      type: "ADMISSIONS",
      title: "Additional information required",
      body: note,
    },
  });

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "APPLICATION_INFO_REQUESTED",
      entity: "Application",
      entityId: applicationId,
      metadataJson: JSON.stringify({ note }),
    },
  });

  revalidatePath(`/staff/admissions/${applicationId}`);
  redirect(`/staff/admissions/${applicationId}?info=1`);
}
