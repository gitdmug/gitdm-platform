/**
 * Programme creation & publishing wizard.
 * Creating/updating a programme is the single source of truth:
 * - Public pages read PUBLISHED + applicationsOpen programmes
 * - Applications can only target open programmes
 * - Rules (fees, clearance thresholds, assessment weights) live on ProgrammeRule
 */

import { getDb } from "@/lib/db";
import { DEFAULT_ACADEMIC_RULES } from "@/lib/academic-rules";

export type ProgrammeWizardInput = {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  durationMonths: number;
  applicationFee?: number;
  tuitionFee?: number;
  currency?: string;
  applicationsOpen?: boolean;
  requiresApplication?: boolean;
  nextStartDate?: string | null;
  intakeLabel?: string;
  awardTitle?: string;
  deliveryMode?: string;
  entryRequirements?: string;
  learningOutcomes?: string;
  // Rules
  passMarkPercent?: number;
  attendanceMinimumPercent?: number;
  assignmentWeightPercent?: number;
  quizWeightPercent?: number;
  examWeightPercent?: number;
  activationPaymentPercent?: number;
  examPaymentClearancePercent?: number;
  examAttemptsAllowed?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

function slugCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export async function createProgramme(input: ProgrammeWizardInput, actorId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const code = slugCode(input.code || input.name);
  if (!code) throw new Error("Programme code is required.");
  if (!input.name?.trim()) throw new Error("Programme name is required.");
  if (!input.durationMonths || input.durationMonths < 1) {
    throw new Error("Duration must be at least 1 month.");
  }

  const existing = await db.programme.findUnique({ where: { code } });
  if (existing) throw new Error(`A programme with code ${code} already exists.`);

  const status = input.status || "DRAFT";

  return db.$transaction(async (tx) => {
    const programme = await tx.programme.create({
      data: {
        code,
        name: input.name.trim(),
        shortName: input.shortName?.trim() || null,
        description: input.description?.trim() || null,
        durationMonths: input.durationMonths,
        applicationFee: input.applicationFee ?? DEFAULT_ACADEMIC_RULES.applicationFeeUgx,
        tuitionFee: input.tuitionFee ?? 0,
        currency: input.currency || "UGX",
        applicationsOpen: input.applicationsOpen ?? false,
        requiresApplication: input.requiresApplication ?? true,
        nextStartDate: input.nextStartDate ? new Date(input.nextStartDate) : null,
        intakeLabel: input.intakeLabel?.trim() || null,
        awardTitle: input.awardTitle?.trim() || null,
        deliveryMode: input.deliveryMode || "ONLINE",
        entryRequirements: input.entryRequirements?.trim() || null,
        learningOutcomes: input.learningOutcomes?.trim() || null,
        status,
      },
    });

    await tx.programmeRule.create({
      data: {
        programmeId: programme.id,
        passMarkPercent: input.passMarkPercent ?? DEFAULT_ACADEMIC_RULES.passMarkPercent,
        attendanceMinimumPercent:
          input.attendanceMinimumPercent ?? DEFAULT_ACADEMIC_RULES.attendanceMinimumPercent,
        assignmentWeightPercent:
          input.assignmentWeightPercent ?? DEFAULT_ACADEMIC_RULES.assignmentWeightPercent,
        quizWeightPercent: input.quizWeightPercent ?? DEFAULT_ACADEMIC_RULES.quizWeightPercent,
        examWeightPercent: input.examWeightPercent ?? DEFAULT_ACADEMIC_RULES.examWeightPercent,
        activationPaymentPercent:
          input.activationPaymentPercent ?? DEFAULT_ACADEMIC_RULES.activationPaymentPercent,
        examPaymentClearancePercent:
          input.examPaymentClearancePercent ?? DEFAULT_ACADEMIC_RULES.examPaymentClearancePercent,
        examAttemptsAllowed: input.examAttemptsAllowed ?? DEFAULT_ACADEMIC_RULES.examAttemptsAllowed,
        minimumEducation: DEFAULT_ACADEMIC_RULES.minimumEducation,
        requiresIdentityDocument: DEFAULT_ACADEMIC_RULES.requiresIdentityDocument,
        requiresEducationDocument: DEFAULT_ACADEMIC_RULES.requiresEducationDocument,
      },
    });

    // Default course so LMS has something to attach modules to
    await tx.course.create({
      data: {
        programmeId: programme.id,
        code: `${code}-CORE`,
        title: input.name.trim(),
        description: input.description?.trim() || null,
        durationMonths: input.durationMonths,
        published: status === "PUBLISHED",
        catalogueVisible: true,
        studentSelectable: true,
        orderIndex: 0,
      },
    });

    // Default open academic period when publishing with a start date
    if (status === "PUBLISHED" && input.nextStartDate) {
      const start = new Date(input.nextStartDate);
      const end = new Date(start);
      end.setMonth(end.getMonth() + input.durationMonths);
      await tx.academicPeriod.create({
        data: {
          programmeId: programme.id,
          name: input.intakeLabel || `Intake ${start.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`,
          sequence: 1,
          startsAt: start,
          endsAt: end,
          feeAmount: input.tuitionFee ?? 0,
          currency: input.currency || "UGX",
          status: "OPEN",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "PROGRAMME_CREATED",
        entity: "Programme",
        entityId: programme.id,
        metadataJson: JSON.stringify({ code, status }),
      },
    });

    return programme;
  });
}

export async function updateProgramme(
  programmeId: string,
  input: Partial<ProgrammeWizardInput>,
  actorId: string
) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.$transaction(async (tx) => {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.shortName !== undefined) data.shortName = input.shortName?.trim() || null;
    if (input.description !== undefined) data.description = input.description?.trim() || null;
    if (input.durationMonths !== undefined) data.durationMonths = input.durationMonths;
    if (input.applicationFee !== undefined) data.applicationFee = input.applicationFee;
    if (input.tuitionFee !== undefined) data.tuitionFee = input.tuitionFee;
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.applicationsOpen !== undefined) data.applicationsOpen = input.applicationsOpen;
    if (input.requiresApplication !== undefined) data.requiresApplication = input.requiresApplication;
    if (input.nextStartDate !== undefined) {
      data.nextStartDate = input.nextStartDate ? new Date(input.nextStartDate) : null;
    }
    if (input.intakeLabel !== undefined) data.intakeLabel = input.intakeLabel?.trim() || null;
    if (input.awardTitle !== undefined) data.awardTitle = input.awardTitle?.trim() || null;
    if (input.deliveryMode !== undefined) data.deliveryMode = input.deliveryMode;
    if (input.entryRequirements !== undefined) {
      data.entryRequirements = input.entryRequirements?.trim() || null;
    }
    if (input.learningOutcomes !== undefined) {
      data.learningOutcomes = input.learningOutcomes?.trim() || null;
    }
    if (input.status !== undefined) data.status = input.status;

    const programme = await tx.programme.update({
      where: { id: programmeId },
      data,
    });

    const ruleData: Record<string, unknown> = {};
    if (input.passMarkPercent !== undefined) ruleData.passMarkPercent = input.passMarkPercent;
    if (input.attendanceMinimumPercent !== undefined) {
      ruleData.attendanceMinimumPercent = input.attendanceMinimumPercent;
    }
    if (input.assignmentWeightPercent !== undefined) {
      ruleData.assignmentWeightPercent = input.assignmentWeightPercent;
    }
    if (input.quizWeightPercent !== undefined) ruleData.quizWeightPercent = input.quizWeightPercent;
    if (input.examWeightPercent !== undefined) ruleData.examWeightPercent = input.examWeightPercent;
    if (input.activationPaymentPercent !== undefined) {
      ruleData.activationPaymentPercent = input.activationPaymentPercent;
    }
    if (input.examPaymentClearancePercent !== undefined) {
      ruleData.examPaymentClearancePercent = input.examPaymentClearancePercent;
    }
    if (input.examAttemptsAllowed !== undefined) {
      ruleData.examAttemptsAllowed = input.examAttemptsAllowed;
    }

    if (Object.keys(ruleData).length > 0) {
      await tx.programmeRule.upsert({
        where: { programmeId },
        create: {
          programmeId,
          ...ruleData,
          minimumEducation: DEFAULT_ACADEMIC_RULES.minimumEducation,
        },
        update: ruleData,
      });
    }

    if (input.status === "PUBLISHED" || programme.status === "PUBLISHED") {
      await ensureDefaultCourse(tx, {
        id: programme.id,
        code: programme.code,
        name: programme.name,
        description: programme.description,
        durationMonths: programme.durationMonths,
      });
    }

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "PROGRAMME_UPDATED",
        entity: "Programme",
        entityId: programmeId,
        metadataJson: JSON.stringify({ fields: Object.keys(data).concat(Object.keys(ruleData)) }),
      },
    });

    return programme;
  });
}

/** Publish makes the programme visible on public pages and eligible for applications. */
export async function publishProgramme(programmeId: string, actorId: string, openApplications = true) {
  return updateProgramme(
    programmeId,
    { status: "PUBLISHED", applicationsOpen: openApplications },
    actorId
  );
}


async function ensureDefaultCourse(tx: any, programme: { id: string; code: string; name: string; description: string | null; durationMonths: number }) {
  const existing = await tx.course.findFirst({ where: { programmeId: programme.id } });
  if (existing) {
    if (!existing.published) {
      await tx.course.update({ where: { id: existing.id }, data: { published: true } });
    }
    return existing;
  }
  return tx.course.create({
    data: {
      programmeId: programme.id,
      code: `${programme.code}-CORE`,
      title: programme.name,
      description: programme.description,
      durationMonths: programme.durationMonths,
      published: true,
      catalogueVisible: true,
      studentSelectable: true,
      orderIndex: 0,
    },
  });
}
