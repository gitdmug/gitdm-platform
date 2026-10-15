import { notifyUser, generateStudentNumber } from "@/lib/notify";
/**
 * Admissions workflow — single source of truth for application lifecycle.
 * Rules enforced:
 * - Application fee must be paid (or explicitly waived) before final decision.
 * - One active programme per student (with documented short-course exception).
 * - Required documents (identity + passport photo) before submission.
 * - Programmes are driven from the database, not hard-coded codes.
 */

import { getDb } from "@/lib/db";

export const REQUIRED_DOCUMENT_TYPES = ["IDENTITY", "PASSPORT_PHOTO"] as const;
export type RequiredDocumentType = (typeof REQUIRED_DOCUMENT_TYPES)[number];

export const APPLICATION_FEE_UGX = 10_000;

/** Returns true if the application fee invoice is settled or waived. */
export async function isApplicationFeeSettled(applicationId: string): Promise<boolean> {
  const db = getDb();
  if (!db) return false;

  const invoice = await db.invoice.findFirst({
    where: { applicationId, kind: "APPLICATION_FEE" },
    select: { status: true, waived: true, amount: true, amountPaid: true },
  });

  if (!invoice) {
    // No fee required for this programme
    return true;
  }
  if (invoice.waived) return true;
  if (invoice.status === "PAID") return true;
  if (Number(invoice.amountPaid) >= Number(invoice.amount)) return true;
  return false;
}

/** Guard used by staff decision actions. Throws if fee not settled. */
export async function assertFeeSettledBeforeDecision(applicationId: string, allowWaiver = false) {
  const settled = await isApplicationFeeSettled(applicationId);
  if (!settled) {
    throw new Error(
      "Application fee must be paid or explicitly waived by an authorised officer before a final admission decision can be recorded."
    );
  }
}

/** Check whether required documents are present. */
export async function hasRequiredDocuments(applicationId: string): Promise<{
  ok: boolean;
  missing: string[];
}> {
  const db = getDb();
  if (!db) return { ok: false, missing: [...REQUIRED_DOCUMENT_TYPES] };

  const docs = await db.applicationDocument.findMany({
    where: { applicationId },
    select: { type: true },
  });
  const present = new Set(docs.map((d) => d.type));
  const missing = REQUIRED_DOCUMENT_TYPES.filter((t) => !present.has(t));
  return { ok: missing.length === 0, missing };
}

/**
 * One-programme rule.
 * A student may have only one ACTIVE/REPEATING enrolment at a time.
 * Exception (configurable later): a learner on a ≥12-month programme may take
 * one concurrent 1-month short course.
 */
export async function assertOneProgrammeRule(
  userId: string,
  targetProgrammeId: string,
  targetDurationMonths: number
) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const running = await db.enrollment.findMany({
    where: { userId, status: { in: ["ACTIVE", "REPEATING"] } },
    include: { programme: { select: { id: true, name: true, durationMonths: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!running.length) return;

  const longRunning = running.some((e) => e.programme.durationMonths >= 12);
  const shortRunning = running.some((e) => e.programme.durationMonths < 12);
  const shortTarget = targetDurationMonths === 1;
  const longTarget = targetDurationMonths >= 12;

  if (longRunning && shortTarget && !shortRunning) {
    const existingShortApp = await db.application.findFirst({
      where: {
        applicantId: userId,
        programme: { durationMonths: 1 },
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
      select: { id: true, programme: { select: { name: true } } },
      orderBy: { submittedAt: "desc" },
    });
    if (existingShortApp) {
      throw new Error(
        `You already have a short-course application (${existingShortApp.programme.name}) while your long programme is running.`
      );
    }
    return;
  }

  const current = running[0].programme.name;
  if (longTarget || !shortTarget || shortRunning) {
    throw new Error(
      `You already have a current programme running: ${current}. You cannot apply for another programme until it is completed.`
    );
  }
}

/** Open programmes available for application (database-driven). */
export async function listOpenProgrammes() {
  const db = getDb();
  if (!db) return [];

  return db.programme.findMany({
    where: {
      status: "PUBLISHED",
      requiresApplication: true,
      applicationsOpen: true,
    },
    include: {
      rules: true,
      periods: {
        where: { status: "OPEN" },
        orderBy: { sequence: "asc" },
        take: 3,
      },
    },
    orderBy: [{ durationMonths: "desc" }, { name: "asc" }],
  });
}

/** After fee is paid, move application from FEE_PENDING → UNDER_REVIEW. */
export async function advanceAfterFeePayment(applicationId: string) {
  const db = getDb();
  if (!db) return;

  const app = await db.application.findUnique({
    where: { id: applicationId },
    select: { status: true },
  });
  if (!app) return;
  if (app.status === "FEE_PENDING" || app.status === "SUBMITTED") {
    await db.application.update({
      where: { id: applicationId },
      data: { status: "UNDER_REVIEW", reviewedAt: null },
    });
  }
}

/** Enrolment handover after admission decision. */
export async function completeEnrolmentHandover(params: {
  applicationId: string;
  decidedById: string;
  decisionType: "ACCEPTED" | "REJECTED" | "CONDITIONAL";
  reason?: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  await assertFeeSettledBeforeDecision(params.applicationId);

  const application = await db.application.findUniqueOrThrow({
    where: { id: params.applicationId },
    include: {
      programme: true,
      feeInvoice: true,
      applicant: true,
    },
  });

  const result = await db.$transaction(async (tx) => {
    // application already loaded for notify context

    // Record decision
    await tx.admissionDecision.create({
      data: {
        applicationId: application.id,
        decision: params.decisionType,
        decidedById: params.decidedById,
        reason: params.reason || null,
        decidedAt: new Date(),
      },
    });

    if (params.decisionType === "REJECTED") {
      await tx.application.update({
        where: { id: application.id },
        data: { status: "REJECTED", reviewedAt: new Date() },
      });
      return { enrollmentId: null };
    }

    // ACCEPTED / CONDITIONAL → admit + activate enrolment path
    await tx.application.update({
      where: { id: application.id },
      data: { status: "ADMITTED", reviewedAt: new Date() },
    });

    // Ensure enrolment exists
    let enrollment = await tx.enrollment.findFirst({
      where: {
        userId: application.applicantId,
        programmeId: application.programmeId,
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (!enrollment) {
      const openPeriod = await tx.academicPeriod.findFirst({
        where: { programmeId: application.programmeId, status: "OPEN" },
        orderBy: { sequence: "asc" },
      });
      enrollment = await tx.enrollment.create({
        data: {
          userId: application.applicantId,
          programmeId: application.programmeId,
          periodId: openPeriod?.id || null,
          status: "PENDING",
          accessLevel: "LIMITED",
          admittedAt: new Date(),
          studentNumber: generateStudentNumber(application.programme.code),
        },
      });
    } else {
      enrollment = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          admittedAt: new Date(),
          status: "PENDING",
          studentNumber: enrollment.studentNumber || generateStudentNumber(application.programme.code),
        },
      });
    }

    // Enrol student on all published courses for this programme
    const programmeCourses = await tx.course.findMany({
      where: { programmeId: application.programmeId, published: true },
      select: { id: true },
    });
    for (const course of programmeCourses) {
      const existingCe = await tx.courseEnrollment.findFirst({
        where: { enrollmentId: enrollment.id, courseId: course.id },
      });
      if (!existingCe) {
        await tx.courseEnrollment.create({
          data: {
            enrollmentId: enrollment.id,
            courseId: course.id,
            status: "ACTIVE",
          },
        });
      }
    }

    // Create tuition invoice if programme has tuition and none exists yet
    const tuitionAmount = Number(application.programme.tuitionFee || 0);
    if (tuitionAmount > 0) {
      const existingTuition = await tx.invoice.findFirst({
        where: {
          enrollmentId: enrollment.id,
          kind: "TUITION",
          status: { not: "VOID" },
        },
      });
      if (!existingTuition) {
        const invoiceNo = `GITDM-TUI-${new Date().getFullYear()}-${enrollment.id.slice(-8).toUpperCase()}`;
        await tx.invoice.create({
          data: {
            enrollmentId: enrollment.id,
            invoiceNo,
            description: `Tuition — ${application.programme.name}`,
            kind: "TUITION",
            amount: tuitionAmount,
            currency: application.programme.currency || "UGX",
            status: "ISSUED",
            dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    return { enrollmentId: enrollment.id, studentNumber: enrollment.studentNumber };
  });

  try {
    if (params.decisionType === "REJECTED") {
      await notifyUser({
        userId: application.applicantId,
        type: "ADMISSIONS",
        title: "Application decision",
        body: `Your application to ${application.programme.name} was not successful at this time.${params.reason ? " " + params.reason : ""}`,
        email: true,
      });
    } else {
      const sn = (result as any).studentNumber;
      await notifyUser({
        userId: application.applicantId,
        type: "ADMISSIONS",
        title: "Offer of admission",
        body: `Congratulations. You have been admitted to ${application.programme.name}.${sn ? " Your student number is " + sn + "." : ""} Complete any outstanding tuition payments to unlock full learning access.`,
        email: true,
      });
    }
  } catch (e) {
    console.warn("[admissions] notify failed", e);
  }

  return result;
}
