/**
 * Quizzes, exams, and course grade calculation.
 * Final score = (A×wA + Q×wQ + E×wE) / 100 using ProgrammeRule weights.
 */

import { getDb } from "@/lib/db";
import { DEFAULT_ACADEMIC_RULES } from "@/lib/academic-rules";
import { computeClearance } from "@/lib/finance-clearance";

function num(v: unknown) {
  return Number(v || 0);
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Auto-mark a single-choice / true-false style answer. */
function isObjectiveCorrect(correctJson: string | null, answerJson: string | null): boolean {
  if (!correctJson || answerJson == null) return false;
  const correct = parseJson<unknown>(correctJson, null);
  const answer = parseJson<unknown>(answerJson, null);
  return JSON.stringify(correct) === JSON.stringify(answer);
}

export async function createQuiz(params: {
  courseId: string;
  title: string;
  instructions?: string;
  passMarkPercent?: number;
  attemptsAllowed?: number;
  timeLimitMinutes?: number;
  questions: Array<{
    prompt: string;
    options?: string[];
    correct?: string | string[] | boolean;
    marks?: number;
  }>;
  publish?: boolean;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.$transaction(async (tx) => {
    const quiz = await tx.quiz.create({
      data: {
        courseId: params.courseId,
        title: params.title.trim(),
        instructions: params.instructions?.trim() || null,
        passMarkPercent: params.passMarkPercent ?? 50,
        attemptsAllowed: params.attemptsAllowed ?? 1,
        timeLimitMinutes: params.timeLimitMinutes || null,
        status: params.publish ? "PUBLISHED" : "DRAFT",
      },
    });

    for (let i = 0; i < params.questions.length; i++) {
      const q = params.questions[i];
      await tx.quizQuestion.create({
        data: {
          quizId: quiz.id,
          prompt: q.prompt,
          optionsJson: q.options ? JSON.stringify(q.options) : null,
          correctJson: q.correct !== undefined ? JSON.stringify(q.correct) : null,
          marks: q.marks ?? 1,
          orderIndex: i,
        },
      });
    }

    return quiz;
  });
}

export async function startQuizAttempt(params: { quizId: string; userId: string }) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const quiz = await db.quiz.findUnique({
    where: { id: params.quizId },
    include: { attempts: { where: { userId: params.userId } } },
  });
  if (!quiz || quiz.status !== "PUBLISHED") throw new Error("Quiz not available.");

  const used = quiz.attempts.length;
  if (used >= quiz.attemptsAllowed) throw new Error("No attempts remaining.");

  // Resume in-progress
  const open = quiz.attempts.find((a) => a.status === "IN_PROGRESS" || a.status === "NOT_STARTED");
  if (open) {
    if (open.status === "NOT_STARTED") {
      return db.quizAttempt.update({
        where: { id: open.id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
    }
    return open;
  }

  return db.quizAttempt.create({
    data: {
      quizId: params.quizId,
      userId: params.userId,
      attemptNo: used + 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });
}

export async function submitQuizAttempt(params: {
  attemptId: string;
  userId: string;
  answers: Record<string, unknown>; // questionId → answer
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const attempt = await db.quizAttempt.findFirst({
    where: { id: params.attemptId, userId: params.userId },
    include: {
      quiz: { include: { questions: true } },
    },
  });
  if (!attempt) throw new Error("Attempt not found.");
  if (attempt.status === "FINALIZED" || attempt.status === "AUTO_MARKED") {
    throw new Error("Attempt already submitted.");
  }

  // Time limit check
  if (attempt.quiz.timeLimitMinutes && attempt.startedAt) {
    const elapsed = (Date.now() - attempt.startedAt.getTime()) / 60000;
    if (elapsed > attempt.quiz.timeLimitMinutes + 1) {
      // still accept but could flag
    }
  }

  let totalMarks = 0;
  let earned = 0;

  await db.$transaction(async (tx) => {
    for (const q of attempt.quiz.questions) {
      totalMarks += num(q.marks);
      const raw = params.answers[q.id];
      const answerJson = raw !== undefined ? JSON.stringify(raw) : null;
      const correct = isObjectiveCorrect(q.correctJson, answerJson);
      const marks = correct ? num(q.marks) : 0;
      if (correct) earned += marks;

      await tx.quizAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId: attempt.id, questionId: q.id },
        },
        create: {
          attemptId: attempt.id,
          questionId: q.id,
          answerJson,
          isCorrect: q.correctJson ? correct : null,
          marks: q.correctJson ? marks : null,
        },
        update: {
          answerJson,
          isCorrect: q.correctJson ? correct : null,
          marks: q.correctJson ? marks : null,
        },
      });
    }

    const scorePercent = totalMarks > 0 ? (earned / totalMarks) * 100 : 0;

    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "AUTO_MARKED",
        submittedAt: new Date(),
        score: Math.round(scorePercent * 100) / 100,
      },
    });
  });

  return { score: totalMarks > 0 ? (earned / totalMarks) * 100 : 0 };
}

export async function createExam(params: {
  courseId: string;
  title: string;
  instructions?: string;
  opensAt?: Date;
  closesAt?: Date;
  timeLimitMinutes?: number;
  attemptsAllowed?: number;
  passMarkPercent?: number;
  actorId: string;
  publish?: boolean;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.exam.create({
    data: {
      courseId: params.courseId,
      title: params.title.trim(),
      instructions: params.instructions?.trim() || null,
      opensAt: params.opensAt || null,
      closesAt: params.closesAt || null,
      timeLimitMinutes: params.timeLimitMinutes || null,
      attemptsAllowed: params.attemptsAllowed ?? 3,
      passMarkPercent: params.passMarkPercent ?? 50,
      status: params.publish ? "PUBLISHED" : "DRAFT",
      createdById: params.actorId,
      publishedAt: params.publish ? new Date() : null,
    },
  });
}

export async function startExamAttempt(params: { examId: string; userId: string }) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const exam = await db.exam.findUnique({
    where: { id: params.examId },
    include: {
      course: true,
      attempts: { where: { userId: params.userId } },
    },
  });
  if (!exam || exam.status !== "PUBLISHED") throw new Error("Exam not available.");

  const now = new Date();
  if (exam.opensAt && now < exam.opensAt) throw new Error("Exam has not opened yet.");
  if (exam.closesAt && now > exam.closesAt) throw new Error("Exam window has closed.");

  // Financial + enrolment eligibility
  const enrollment = await db.enrollment.findFirst({
    where: {
      userId: params.userId,
      programmeId: exam.course.programmeId || undefined,
      status: { in: ["ACTIVE", "REPEATING", "PENDING"] },
    },
  });
  if (enrollment) {
    const clearance = await computeClearance(enrollment.id);
    if (clearance && !clearance.examEligible) {
      throw new Error(
        `Exam clearance requires ${clearance.examPercentRequired}% of tuition paid (you have ${clearance.percentPaid}%).`
      );
    }
  }

  const used = exam.attempts.filter((a) =>
    ["SUBMITTED", "AUTO_MARKED", "FINALIZED", "MANUAL_REVIEW"].includes(a.status)
  ).length;
  if (used >= exam.attemptsAllowed) throw new Error("No exam attempts remaining.");

  const open = exam.attempts.find((a) => a.status === "IN_PROGRESS");
  if (open) return open;

  return db.examAttempt.create({
    data: {
      examId: params.examId,
      userId: params.userId,
      attemptNo: used + 1,
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });
}

export async function submitExamAttempt(params: {
  attemptId: string;
  userId: string;
  answers: Record<string, unknown>;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const attempt = await db.examAttempt.findFirst({
    where: { id: params.attemptId, userId: params.userId },
    include: { exam: { include: { questions: true } } },
  });
  if (!attempt) throw new Error("Attempt not found.");
  if (["SUBMITTED", "AUTO_MARKED", "FINALIZED"].includes(attempt.status)) {
    throw new Error("Already submitted.");
  }

  let autoTotal = 0;
  let autoEarned = 0;
  let needsManual = false;

  await db.$transaction(async (tx) => {
    for (const q of attempt.exam.questions) {
      const raw = params.answers[q.id];
      const answerJson = raw !== undefined ? JSON.stringify(raw) : null;
      const objective = ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "NUMERICAL"].includes(
        q.type
      );

      let autoMarks: number | null = null;
      if (objective && q.correctJson) {
        autoTotal += num(q.marks);
        const ok = isObjectiveCorrect(q.correctJson, answerJson);
        autoMarks = ok ? num(q.marks) : 0;
        if (ok) autoEarned += autoMarks;
      } else {
        needsManual = true;
      }

      await tx.examAnswer.upsert({
        where: {
          attemptId_questionId: { attemptId: attempt.id, questionId: q.id },
        },
        create: {
          attemptId: attempt.id,
          questionId: q.id,
          answerJson,
          autoMarks,
        },
        update: { answerJson, autoMarks },
      });
    }

    const autoScore = autoTotal > 0 ? (autoEarned / autoTotal) * 100 : null;

    await tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: needsManual ? "MANUAL_REVIEW" : "AUTO_MARKED",
        submittedAt: new Date(),
        autoScore: autoScore != null ? Math.round(autoScore * 100) / 100 : null,
        finalScore: needsManual ? null : autoScore != null ? Math.round(autoScore * 100) / 100 : null,
      },
    });
  });
}

/**
 * Calculate and upsert course grade from assignments, quizzes, exams.
 * Uses programme rule weights (default 30/20/50).
 */
export async function calculateCourseGrade(params: {
  userId: string;
  courseId: string;
  periodId?: string | null;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      programme: { include: { rules: true } },
      assignments: {
        where: { status: "PUBLISHED" },
        include: { submissions: { where: { userId: params.userId, status: { in: ["SUBMITTED", "LATE", "GRADED"] } } } },
      },
      quizzes: {
        where: { status: "PUBLISHED" },
        include: {
          attempts: {
            where: { userId: params.userId, status: { in: ["AUTO_MARKED", "FINALIZED"] } },
            orderBy: { score: "desc" },
            take: 1,
          },
        },
      },
      exams: {
        where: { status: { in: ["PUBLISHED", "CLOSED"] } },
        include: {
          attempts: {
            where: {
              userId: params.userId,
              status: { in: ["AUTO_MARKED", "FINALIZED", "MARKED_PENDING_CONFIRMATION"] },
            },
            orderBy: { finalScore: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!course) throw new Error("Course not found.");

  const rules = course.programme?.rules;
  const wA = num(rules?.assignmentWeightPercent ?? DEFAULT_ACADEMIC_RULES.assignmentWeightPercent);
  const wQ = num(rules?.quizWeightPercent ?? DEFAULT_ACADEMIC_RULES.quizWeightPercent);
  const wE = num(rules?.examWeightPercent ?? DEFAULT_ACADEMIC_RULES.examWeightPercent);
  const passMark = num(rules?.passMarkPercent ?? DEFAULT_ACADEMIC_RULES.passMarkPercent);

  // Assignment average (% of max marks)
  let assignmentPercent = 0;
  if (course.assignments.length > 0) {
    let sum = 0;
    let count = 0;
    for (const a of course.assignments) {
      const sub = a.submissions[0];
      if (sub?.score != null) {
        sum += (num(sub.score) / Math.max(num(a.maxMarks), 1)) * 100;
        count++;
      }
    }
    assignmentPercent = count > 0 ? sum / count : 0;
  }

  // Best quiz score
  let quizPercent = 0;
  if (course.quizzes.length > 0) {
    const scores = course.quizzes
      .map((q) => (q.attempts[0]?.score != null ? num(q.attempts[0].score) : null))
      .filter((s): s is number => s != null);
    quizPercent = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  // Best exam score
  let examPercent = 0;
  if (course.exams.length > 0) {
    const scores = course.exams
      .map((e) => {
        const att = e.attempts[0];
        if (!att) return null;
        return att.finalScore != null ? num(att.finalScore) : att.autoScore != null ? num(att.autoScore) : null;
      })
      .filter((s): s is number => s != null);
    examPercent = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  }

  const totalPercent =
    (assignmentPercent * wA + quizPercent * wQ + examPercent * wE) / Math.max(wA + wQ + wE, 1);

  const grade = await db.grade.upsert({
    where: {
      userId_courseId_periodId: {
        userId: params.userId,
        courseId: params.courseId,
        periodId: params.periodId ?? null,
      } as any,
    },
    create: {
      userId: params.userId,
      courseId: params.courseId,
      periodId: params.periodId || null,
      assignmentPercent: Math.round(assignmentPercent * 100) / 100,
      quizPercent: Math.round(quizPercent * 100) / 100,
      examPercent: Math.round(examPercent * 100) / 100,
      totalPercent: Math.round(totalPercent * 100) / 100,
      status: "PROVISIONAL",
    },
    update: {
      assignmentPercent: Math.round(assignmentPercent * 100) / 100,
      quizPercent: Math.round(quizPercent * 100) / 100,
      examPercent: Math.round(examPercent * 100) / 100,
      totalPercent: Math.round(totalPercent * 100) / 100,
    },
  });

  return { grade, passMark, passed: totalPercent >= passMark };
}

export async function finalizeGrade(gradeId: string, actorId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const grade = await db.grade.update({
    where: { id: gradeId },
    data: { status: "FINAL", finalizedAt: new Date() },
  });

  await db.auditLog.create({
    data: {
      userId: actorId,
      action: "GRADE_FINALIZED",
      entity: "Grade",
      entityId: gradeId,
    },
  });

  return grade;
}
