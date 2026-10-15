"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { notifyStudentChange } from "@/lib/student-email";
import {
  assertOneProgrammeRule,
  hasRequiredDocuments,
  APPLICATION_FEE_UGX,
} from "@/lib/admissions-workflow";

/**
 * Start a new application for an open, published programme.
 * Programmes are selected from the database — no hard-coded catalogue codes.
 */
export async function startApplication(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in?returnTo=/admissions/apply");

  const programmeId = String(formData.get("programmeId") || "").trim();
  if (!programmeId) throw new Error("Please select a programme.");

  const programme = await db.programme.findFirst({
    where: {
      id: programmeId,
      status: "PUBLISHED",
      requiresApplication: true,
      applicationsOpen: true,
    },
    include: {
      rules: true,
      periods: { where: { status: "OPEN" }, orderBy: { sequence: "asc" }, take: 1 },
    },
  });
  if (!programme) {
    throw new Error("This programme is not currently open for applications.");
  }

  await assertOneProgrammeRule(user.id, programmeId, programme.durationMonths);

  // Resume existing in-progress application for the same programme
  const existing = await db.application.findFirst({
    where: {
      applicantId: user.id,
      programmeId,
      status: {
        in: [
          "DRAFT",
          "SUBMITTED",
          "FEE_PENDING",
          "UNDER_REVIEW",
          "INTERVIEW_SCHEDULED",
          "INTERVIEW_REQUIRED",
          "ADDITIONAL_INFORMATION",
          "ADMITTED",
          "ACCEPTED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (existing) redirect(`/admissions/apply/${existing.id}`);

  const app = await db.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        applicantId: user.id,
        programmeId,
        status: "DRAFT",
        legalName: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        phone: user.phone || null,
      },
    });

    const period = programme.periods[0] || null;
    const enrollment = await tx.enrollment.create({
      data: {
        userId: user.id,
        programmeId,
        periodId: period?.id || null,
        status: "PENDING",
        accessLevel: "LIMITED",
      },
    });

    const feeAmount = Number(programme.applicationFee) > 0
      ? Number(programme.applicationFee)
      : APPLICATION_FEE_UGX;

    if (feeAmount > 0) {
      const invoiceNo = `GITDM-APP-${new Date().getFullYear()}-${created.id.slice(-8).toUpperCase()}`;
      await tx.invoice.create({
        data: {
          enrollmentId: enrollment.id,
          periodId: null,
          applicationId: created.id,
          invoiceNo,
          description: `Application fee — ${programme.name}`,
          kind: "APPLICATION_FEE",
          amount: feeAmount,
          currency: programme.currency || "UGX",
          status: "ISSUED",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "APPLICATION_STARTED",
        entity: "Application",
        entityId: created.id,
        metadataJson: JSON.stringify({ programmeId, programmeCode: programme.code }),
      },
    });

    return created;
  });

  revalidatePath("/admissions/apply");
  redirect(`/admissions/apply/${app.id}`);
}

/**
 * Save personal / educational details (draft).
 */
export async function saveApplicationDetails(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");

  const id = String(formData.get("applicationId") || "");
  const app = await db.application.findFirst({
    where: { id, applicantId: user.id, status: { in: ["DRAFT", "ADDITIONAL_INFORMATION"] } },
  });
  if (!app) throw new Error("Application not found or can no longer be edited.");

  const data = {
    legalName: String(formData.get("legalName") || "").trim() || null,
    phone: String(formData.get("phone") || "").trim() || null,
    dateOfBirth: formData.get("dateOfBirth")
      ? new Date(String(formData.get("dateOfBirth")))
      : null,
    nationality: String(formData.get("nationality") || "").trim() || null,
    gender: String(formData.get("gender") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    city: String(formData.get("city") || "").trim() || null,
    country: String(formData.get("country") || "Uganda").trim() || "Uganda",
    educationBackground: String(formData.get("educationBackground") || "").trim() || null,
    motivation: String(formData.get("motivation") || "").trim() || null,
    howHeard: String(formData.get("howHeard") || "").trim() || null,
  };

  await db.application.update({ where: { id }, data });
  revalidatePath(`/admissions/apply/${id}`);
  return { ok: true };
}

/**
 * Submit the application.
 * Requires: identity document + passport photo.
 * Moves status to FEE_PENDING (if fee due) or UNDER_REVIEW (if fee already settled / zero).
 */
export async function submitApplication(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");

  const id = String(formData.get("applicationId") || "");
  const app = await db.application.findFirst({
    where: {
      id,
      applicantId: user.id,
      status: { in: ["DRAFT", "ADDITIONAL_INFORMATION"] },
    },
    include: {
      documents: true,
      programme: true,
      feeInvoice: true,
    },
  });
  if (!app) throw new Error("Application not found or already submitted.");

  // Mandatory documents
  const { ok, missing } = await hasRequiredDocuments(id);
  if (!ok) {
    const labels: Record<string, string> = {
      IDENTITY: "identification document (ID / passport / driver’s licence / voter slip)",
      PASSPORT_PHOTO: "passport-style photograph",
    };
    throw new Error(
      `Please upload the following before submitting: ${missing.map((m) => labels[m] || m).join(" and ")}.`
    );
  }

  // Basic personal fields
  if (!app.legalName || !app.phone) {
    throw new Error("Please complete your full legal name and phone number before submitting.");
  }

  const feeDue =
    app.feeInvoice &&
    !app.feeInvoice.waived &&
    app.feeInvoice.status !== "PAID" &&
    Number(app.feeInvoice.amountPaid) < Number(app.feeInvoice.amount);

  const nextStatus = feeDue ? "FEE_PENDING" : "UNDER_REVIEW";

  await db.application.update({
    where: { id },
    data: { status: nextStatus, submittedAt: new Date() },
  });

  const body = feeDue
    ? `Your ${app.programme.name} application has been submitted. Please pay the application fee of ${app.feeInvoice?.currency || "UGX"} ${Number(app.feeInvoice?.amount || 0).toLocaleString()} so Admissions can begin review.`
    : `Your ${app.programme.name} application has been submitted and is now under review. Admissions will contact you if an interview or additional information is required.`;

  await db.notification.create({
    data: {
      userId: user.id,
      type: "ADMISSIONS",
      title: feeDue ? "Application fee required" : "Application submitted",
      body,
    },
  });

  try {
    await notifyStudentChange({
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      title: feeDue ? "Application fee required" : "Application submitted",
      body,
      action: "APPLICATION_SUBMITTED",
      event: "APPLICATION_SUBMITTED",
      href: `/admissions/apply/${id}`,
    });
  } catch {
    // non-blocking
  }

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "APPLICATION_SUBMITTED",
      entity: "Application",
      entityId: id,
      metadataJson: JSON.stringify({ nextStatus }),
    },
  });

  revalidatePath(`/admissions/apply/${id}`);
  redirect(`/admissions/apply/${id}?submitted=1`);
}
