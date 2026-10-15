import { notifyUser } from "@/lib/notify";
/**
 * Certificate & transcript issuance.
 * Academic completion is required first; payment clearance only when policy requires it.
 */

import { getDb } from "@/lib/db";
import { calculateCourseGrade } from "@/lib/assessments";
import { computeClearance } from "@/lib/finance-clearance";
import { DEFAULT_ACADEMIC_RULES } from "@/lib/academic-rules";

function certNumber() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GITDM-CERT-${y}-${rand}`;
}

function transcriptNumber() {
  const y = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GITDM-TRN-${y}-${rand}`;
}

/**
 * Check whether a student has completed all published courses in their programme.
 */
export async function evaluateCertificateEligibility(userId: string, programmeId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const programme = await db.programme.findUnique({
    where: { id: programmeId },
    include: {
      rules: true,
      courses: { where: { published: true } },
    },
  });
  if (!programme) throw new Error("Programme not found.");

  const passMark = Number(programme.rules?.passMarkPercent ?? DEFAULT_ACADEMIC_RULES.passMarkPercent);
  const courses = programme.courses;
  const results: Array<{ courseId: string; title: string; total: number; passed: boolean }> = [];

  for (const course of courses) {
    const { grade, passed } = await calculateCourseGrade({
      userId,
      courseId: course.id,
    });
    results.push({
      courseId: course.id,
      title: course.title,
      total: Number(grade.totalPercent),
      passed: passed || Number(grade.totalPercent) >= passMark,
    });
  }

  const allPassed = courses.length > 0 && results.every((r) => r.passed);
  const enrollment = await db.enrollment.findFirst({
    where: { userId, programmeId, status: { in: ["ACTIVE", "COMPLETED", "PENDING"] } },
  });

  let financiallyOk = true;
  if (enrollment) {
    const clearance = await computeClearance(enrollment.id);
    // Certificates require financial clearance when there are tuition invoices
    if (clearance && clearance.totalInvoiced > 0) {
      financiallyOk = clearance.financiallyCleared || clearance.overrideActive;
    }
  }

  return {
    academicallyComplete: allPassed,
    financiallyCleared: financiallyOk,
    eligible: allPassed && financiallyOk,
    results,
    passMark,
  };
}

export async function issueCertificate(params: {
  userId: string;
  programmeId: string;
  actorId: string;
  force?: boolean;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const eligibility = await evaluateCertificateEligibility(params.userId, params.programmeId);
  if (!eligibility.eligible && !params.force) {
    throw new Error(
      `Not eligible: academic=${eligibility.academicallyComplete}, finance=${eligibility.financiallyCleared}`
    );
  }

  const existing = await db.certificate.findFirst({
    where: {
      userId: params.userId,
      programmeId: params.programmeId,
      status: { in: ["ELIGIBLE", "ISSUED"] },
    },
  });
  if (existing?.status === "ISSUED") {
    return existing;
  }

  const number = certNumber();
  const cert = await db.$transaction(async (tx) => {
    const c = existing
      ? await tx.certificate.update({
          where: { id: existing.id },
          data: { status: "ISSUED", issuedAt: new Date(), number: existing.number || number },
        })
      : await tx.certificate.create({
          data: {
            userId: params.userId,
            programmeId: params.programmeId,
            number,
            status: "ISSUED",
            issuedAt: new Date(),
          },
        });

    await tx.certificateVerification.upsert({
      where: { certificateId: c.id },
      create: { certificateId: c.id },
      update: {},
    });

    // Mark enrolment completed
    await tx.enrollment.updateMany({
      where: {
        userId: params.userId,
        programmeId: params.programmeId,
        status: { in: ["ACTIVE", "PENDING"] },
      },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorId,
        action: "CERTIFICATE_ISSUED",
        entity: "Certificate",
        entityId: c.id,
        metadataJson: JSON.stringify({ number: c.number, studentId: params.userId }),
      },
    });

    return c;
  });

  try {
    await notifyUser({
      userId: params.userId,
      type: "ACADEMIC",
      title: "Certificate issued",
      body: `Your certificate ${cert.number} has been issued. You can verify it publicly at /verify/${cert.number}.`,
      email: true,
    });
  } catch (e) {
    console.warn("[certificate] notify failed", e);
  }

  return cert;
}

export async function generateTranscript(params: {
  userId: string;
  programmeId: string;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const programme = await db.programme.findUnique({
    where: { id: params.programmeId },
    include: { courses: { where: { published: true } } },
  });
  if (!programme) throw new Error("Programme not found.");

  const number = transcriptNumber();

  return db.$transaction(async (tx) => {
    const transcript = await tx.transcript.create({
      data: {
        userId: params.userId,
        programmeId: params.programmeId,
        number,
        status: "OFFICIAL",
      },
    });

    for (const course of programme.courses) {
      const { grade } = await calculateCourseGrade({
        userId: params.userId,
        courseId: course.id,
      });
      await tx.transcriptEntry.create({
        data: {
          transcriptId: transcript.id,
          courseId: course.id,
          gradeId: grade.id,
          score: grade.totalPercent,
          gradeLabel: Number(grade.totalPercent) >= 50 ? "PASS" : "FAIL",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: params.actorId,
        action: "TRANSCRIPT_GENERATED",
        entity: "Transcript",
        entityId: transcript.id,
      },
    });

    return transcript;
  });
}

/** Public verification — minimal disclosure. */
export async function verifyCertificatePublic(number: string) {
  const db = getDb();
  if (!db) return null;

  const cert = await db.certificate.findFirst({
    where: { number: number.trim().toUpperCase() },
    include: {
      programme: { select: { name: true, awardTitle: true } },
      user: { select: { firstName: true, lastName: true } },
      verification: true,
    },
  });

  if (!cert || cert.status !== "ISSUED") return null;

  // Touch verification record
  if (cert.verification) {
    await db.certificateVerification.update({
      where: { id: cert.verification.id },
      data: { verifiedAt: new Date() },
    });
  }

  const name = [cert.user.firstName, cert.user.lastName].filter(Boolean).join(" ") || "Graduate";

  return {
    valid: true,
    number: cert.number,
    holderName: name,
    programme: cert.programme.awardTitle || cert.programme.name,
    issuedAt: cert.issuedAt,
    status: cert.status,
  };
}
