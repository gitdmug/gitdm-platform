/**
 * Registrar — official student records, enrolment status, progression.
 * Does not overwrite lecturer marks or Finance payments.
 */

import { getDb } from "@/lib/db";

export async function listStudents(opts?: {
  status?: string;
  programmeId?: string;
  q?: string;
}) {
  const db = getDb();
  if (!db) return [];

  const where: any = {};
  if (opts?.status) where.status = opts.status;
  if (opts?.programmeId) where.programmeId = opts.programmeId;
  if (opts?.q) {
    where.user = {
      OR: [
        { email: { contains: opts.q, mode: "insensitive" } },
        { firstName: { contains: opts.q, mode: "insensitive" } },
        { lastName: { contains: opts.q, mode: "insensitive" } },
      ],
    };
  }

  return db.enrollment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          status: true,
        },
      },
      programme: { select: { id: true, name: true, code: true } },
      period: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function updateEnrollmentStatus(params: {
  enrollmentId: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "SUSPENDED" | "WITHDRAWN" | "REPEATING";
  reason: string;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const before = await db.enrollment.findUniqueOrThrow({
    where: { id: params.enrollmentId },
  });

  const data: any = { status: params.status };
  if (params.status === "ACTIVE" && !before.activatedAt) {
    data.activatedAt = new Date();
    data.accessLevel = before.accessLevel === "RESTRICTED" ? "LIMITED" : before.accessLevel;
  }
  if (params.status === "COMPLETED") data.completedAt = new Date();
  if (params.status === "SUSPENDED") data.accessLevel = "RESTRICTED";

  const updated = await db.enrollment.update({
    where: { id: params.enrollmentId },
    data,
  });

  await db.auditLog.create({
    data: {
      userId: params.actorId,
      action: "ENROLLMENT_STATUS_CHANGED",
      entity: "Enrollment",
      entityId: params.enrollmentId,
      metadataJson: JSON.stringify({
        from: before.status,
        to: params.status,
        reason: params.reason,
      }),
    },
  });

  return updated;
}

export async function activateStudent(params: {
  enrollmentId: string;
  actorId: string;
  reason?: string;
}) {
  return updateEnrollmentStatus({
    enrollmentId: params.enrollmentId,
    status: "ACTIVE",
    reason: params.reason || "Activated by Registrar",
    actorId: params.actorId,
  });
}
