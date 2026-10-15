/**
 * Learning Management — courses, modules, lessons, progress.
 * Access is gated by Enrollment.accessLevel (set by finance clearance).
 */

import { getDb } from "@/lib/db";
import { computeClearance } from "@/lib/finance-clearance";

export async function getStudentLearningContext(userId: string) {
  const db = getDb();
  if (!db) return null;

  try {
    const enrollment = await db.enrollment.findFirst({
      where: { userId, status: { in: ["PENDING", "ACTIVE", "REPEATING"] } },
      include: {
        programme: {
          include: {
            courses: {
              where: { published: true },
              orderBy: { orderIndex: "asc" },
              include: {
                modules: {
                  where: { published: true },
                  orderBy: { orderIndex: "asc" },
                  include: {
                    lessons: {
                      where: { published: true },
                      orderBy: { orderIndex: "asc" },
                      include: { resources: true },
                    },
                  },
                },
                faculty: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } },
                },
              },
            },
          },
        },
        courses: { include: { course: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!enrollment) return null;

    let clearance = null;
    try {
      clearance = await computeClearance(enrollment.id);
    } catch (e) {
      console.warn("[lms] clearance failed", e);
    }
    const canAccessFull =
      clearance?.learningAccessEligible || enrollment.accessLevel === "FULL";

    return { enrollment, clearance, canAccessFull };
  } catch (e) {
    console.error("[lms] getStudentLearningContext failed", e);
    // Fallback: enrolment without nested course tree
    try {
      const enrollment = await db.enrollment.findFirst({
        where: { userId, status: { in: ["PENDING", "ACTIVE", "REPEATING"] } },
        include: { programme: true },
        orderBy: { createdAt: "desc" },
      });
      if (!enrollment) return null;
      return {
        enrollment: { ...enrollment, programme: { ...enrollment.programme, courses: [] } },
        clearance: null,
        canAccessFull: enrollment.accessLevel === "FULL",
      };
    } catch {
      return null;
    }
  }
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const ctx = await getStudentLearningContext(userId);
  if (!ctx?.canAccessFull) {
    throw new Error("Learning access requires the configured tuition payment threshold.");
  }

  // Verify lesson belongs to student's programme
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson || lesson.module.course.programmeId !== ctx.enrollment.programmeId) {
    throw new Error("Lesson not found in your programme.");
  }

  return db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, completed: true, completedAt: new Date() },
    update: { completed: true, completedAt: new Date() },
  });
}

export async function getLessonProgressMap(userId: string, lessonIds: string[]) {
  const db = getDb();
  if (!db || lessonIds.length === 0) return new Map<string, boolean>();

  const rows = await db.lessonProgress.findMany({
    where: { userId, lessonId: { in: lessonIds } },
    select: { lessonId: true, completed: true },
  });
  return new Map(rows.map((r) => [r.lessonId, r.completed]));
}

/** Lecturer / academic: create module under a course */
export async function createModule(params: {
  courseId: string;
  title: string;
  description?: string;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const maxOrder = await db.courseModule.aggregate({
    where: { courseId: params.courseId },
    _max: { orderIndex: true },
  });

  const module = await db.courseModule.create({
    data: {
      courseId: params.courseId,
      title: params.title.trim(),
      description: params.description?.trim() || null,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      published: false,
      approvalStatus: "DRAFT",
    },
  });

  await db.auditLog.create({
    data: {
      userId: params.actorId,
      action: "MODULE_CREATED",
      entity: "CourseModule",
      entityId: module.id,
      metadataJson: JSON.stringify({ courseId: params.courseId }),
    },
  });

  return module;
}

export async function createLesson(params: {
  moduleId: string;
  title: string;
  type?: string;
  content?: string;
  videoUrl?: string;
  durationMinutes?: number;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const maxOrder = await db.lesson.aggregate({
    where: { moduleId: params.moduleId },
    _max: { orderIndex: true },
  });

  const lesson = await db.lesson.create({
    data: {
      moduleId: params.moduleId,
      title: params.title.trim(),
      type: (params.type as any) || "ARTICLE",
      content: params.content?.trim() || null,
      videoUrl: params.videoUrl?.trim() || null,
      durationMinutes: params.durationMinutes || null,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      published: false,
    },
  });

  await db.auditLog.create({
    data: {
      userId: params.actorId,
      action: "LESSON_CREATED",
      entity: "Lesson",
      entityId: lesson.id,
    },
  });

  return lesson;
}

export async function publishLesson(lessonId: string, actorId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const lesson = await db.lesson.update({
    where: { id: lessonId },
    data: { published: true },
    include: { module: true },
  });

  // Auto-publish parent module if needed
  if (!lesson.module.published) {
    await db.courseModule.update({
      where: { id: lesson.moduleId },
      data: { published: true, approvalStatus: "APPROVED" },
    });
  }

  await db.auditLog.create({
    data: {
      userId: actorId,
      action: "LESSON_PUBLISHED",
      entity: "Lesson",
      entityId: lessonId,
    },
  });

  return lesson;
}

export async function createAssignment(params: {
  courseId: string;
  title: string;
  instructions: string;
  maxMarks: number;
  dueAt?: Date | null;
  actorId: string;
  publish?: boolean;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.assignment.create({
    data: {
      courseId: params.courseId,
      title: params.title.trim(),
      instructions: params.instructions.trim(),
      maxMarks: params.maxMarks,
      dueAt: params.dueAt || null,
      status: params.publish ? "PUBLISHED" : "DRAFT",
      createdById: params.actorId,
    },
  });
}

export async function submitAssignment(params: {
  assignmentId: string;
  userId: string;
  textAnswer?: string;
  fileUrl?: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const assignment = await db.assignment.findUnique({
    where: { id: params.assignmentId },
  });
  if (!assignment || assignment.status !== "PUBLISHED") {
    throw new Error("Assignment is not available for submission.");
  }
  if (assignment.dueAt && assignment.dueAt < new Date()) {
    // Allow late but mark as LATE
  }

  const late = assignment.dueAt ? assignment.dueAt < new Date() : false;

  return db.assignmentSubmission.upsert({
    where: {
      assignmentId_userId: { assignmentId: params.assignmentId, userId: params.userId },
    },
    create: {
      assignmentId: params.assignmentId,
      userId: params.userId,
      textAnswer: params.textAnswer || null,
      fileUrl: params.fileUrl || null,
      status: late ? "LATE" : "SUBMITTED",
      submittedAt: new Date(),
    },
    update: {
      textAnswer: params.textAnswer || null,
      fileUrl: params.fileUrl || null,
      status: late ? "LATE" : "SUBMITTED",
      submittedAt: new Date(),
    },
  });
}

export async function gradeAssignmentSubmission(params: {
  submissionId: string;
  score: number;
  feedback?: string;
  graderId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const sub = await db.assignmentSubmission.findUnique({
    where: { id: params.submissionId },
    include: { assignment: true },
  });
  if (!sub) throw new Error("Submission not found.");

  const max = Number(sub.assignment.maxMarks);
  if (params.score < 0 || params.score > max) {
    throw new Error(`Score must be between 0 and ${max}.`);
  }

  const updated = await db.assignmentSubmission.update({
    where: { id: params.submissionId },
    data: {
      score: params.score,
      feedback: params.feedback?.trim() || null,
      status: "GRADED",
      gradedAt: new Date(),
      gradedById: params.graderId,
    },
  });

  await db.notification.create({
    data: {
      userId: sub.userId,
      type: "ACADEMIC",
      title: "Assignment graded",
      body: `${sub.assignment.title}: ${params.score}/${max}${
        params.feedback ? ` — ${params.feedback.slice(0, 120)}` : ""
      }`,
    },
  });

  return updated;
}

export async function listSubmissionsForCourse(courseId: string) {
  const db = getDb();
  if (!db) return [];

  return db.assignmentSubmission.findMany({
    where: {
      assignment: { courseId, status: "PUBLISHED" },
      status: { in: ["SUBMITTED", "LATE", "GRADED"] },
    },
    include: {
      assignment: { select: { id: true, title: true, maxMarks: true } },
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });
}

export async function createModuleWithLesson(params: {
  courseId: string;
  moduleTitle: string;
  moduleOrder?: number;
  lessonTitle: string;
  lessonContent?: string;
  videoUrl?: string;
  durationMinutes?: number;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.$transaction(async (tx) => {
    const mod = await tx.courseModule.create({
      data: {
        courseId: params.courseId,
        title: params.moduleTitle.trim(),
        orderIndex: params.moduleOrder ?? 0,
        published: true,
        approvalStatus: "APPROVED",
      },
    });
    const lesson = await tx.lesson.create({
      data: {
        moduleId: mod.id,
        title: params.lessonTitle.trim(),
        type: params.videoUrl ? "VIDEO" : "ARTICLE",
        content: params.lessonContent?.trim() || null,
        videoUrl: params.videoUrl?.trim() || null,
        durationMinutes: params.durationMinutes || null,
        orderIndex: 0,
        published: true,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: params.actorId,
        action: "MODULE_LESSON_CREATED",
        entity: "CourseModule",
        entityId: mod.id,
      },
    });
    return { module: mod, lesson };
  });
}
