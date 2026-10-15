/**
 * Parent / guardian portal — consent-based link to student records.
 * Parents see progress and finance summary only; no grade mutation.
 */

import { getDb } from "@/lib/db";
import { computeClearance } from "@/lib/finance-clearance";
import { calculateCourseGrade } from "@/lib/assessments";

export async function linkParentToStudent(params: {
  parentId: string;
  studentId: string;
  relationship?: string;
  isPrimary?: boolean;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");
  if (params.parentId === params.studentId) {
    throw new Error("Cannot link a user to themselves.");
  }

  const link = await db.parentStudent.upsert({
    where: {
      parentId_studentId: {
        parentId: params.parentId,
        studentId: params.studentId,
      },
    },
    create: {
      parentId: params.parentId,
      studentId: params.studentId,
      relationship: params.relationship || "Guardian",
      isPrimary: params.isPrimary ?? false,
    },
    update: {
      relationship: params.relationship || "Guardian",
      isPrimary: params.isPrimary ?? false,
    },
  });

  await db.auditLog.create({
    data: {
      userId: params.actorId,
      action: "PARENT_STUDENT_LINKED",
      entity: "ParentStudent",
      entityId: `${params.parentId}:${params.studentId}`,
      metadataJson: JSON.stringify({
        relationship: params.relationship,
      }),
    },
  });

  return link;
}

export async function listLinkedStudents(parentId: string) {
  const db = getDb();
  if (!db) return [];

  return db.parentStudent.findMany({
    where: { parentId },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getStudentSnapshotForParent(studentId: string) {
  const db = getDb();
  if (!db) return null;

  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: studentId,
      status: { in: ["ACTIVE", "PENDING", "COMPLETED", "SUSPENDED"] },
    },
    include: {
      programme: {
        include: {
          courses: { where: { published: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!enrollment) {
    return { enrollment: null, clearance: null, grades: [] as any[] };
  }

  const clearance = await computeClearance(enrollment.id);
  const grades = [];
  for (const course of enrollment.programme.courses) {
    try {
      const result = await calculateCourseGrade({
        userId: studentId,
        courseId: course.id,
        periodId: enrollment.periodId,
      });
      grades.push({
        courseTitle: course.title,
        total: Number(result.grade.totalPercent),
        passed: result.passed,
      });
    } catch {
      grades.push({ courseTitle: course.title, total: null, passed: null });
    }
  }

  return { enrollment, clearance, grades };
}
