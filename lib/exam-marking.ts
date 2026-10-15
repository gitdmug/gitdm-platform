import { getDb } from "@/lib/db";

/** Manual marks for essay / short-answer exam attempts. */
export async function markExamAttempt(params: {
  attemptId: string;
  marks: Record<string, number>; // questionId → marks
  feedback?: Record<string, string>;
  actorId: string;
  finalize?: boolean;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const attempt = await db.examAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      exam: { include: { questions: true } },
      answers: true,
    },
  });
  if (!attempt) throw new Error("Attempt not found.");

  let totalPossible = 0;
  let totalEarned = 0;

  await db.$transaction(async (tx) => {
    for (const q of attempt.exam.questions) {
      totalPossible += Number(q.marks);
      const answer = attempt.answers.find((a) => a.questionId === q.id);
      const auto = answer?.autoMarks != null ? Number(answer.autoMarks) : null;
      const manual =
        params.marks[q.id] !== undefined ? Number(params.marks[q.id]) : null;

      const finalMarks = manual != null ? manual : auto != null ? auto : 0;
      totalEarned += finalMarks;

      if (answer) {
        await tx.examAnswer.update({
          where: { id: answer.id },
          data: {
            manualMarks: manual,
            feedback: params.feedback?.[q.id] || answer.feedback,
          },
        });
      }
    }

    const finalScore =
      totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 10000) / 100 : 0;

    await tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        manualScore: Math.round((totalEarned / Math.max(totalPossible, 1)) * 10000) / 100,
        finalScore,
        status: params.finalize !== false ? "FINALIZED" : "MARKED_PENDING_CONFIRMATION",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: params.actorId,
        action: "EXAM_ATTEMPT_MARKED",
        entity: "ExamAttempt",
        entityId: attempt.id,
        metadataJson: JSON.stringify({ finalScore }),
      },
    });

    await tx.notification.create({
      data: {
        userId: attempt.userId,
        type: "ACADEMIC",
        title: "Exam marked",
        body: `Your exam "${attempt.exam.title}" has been marked. Score: ${finalScore}%.`,
      },
    });
  });
}

export async function listPendingExamAttempts() {
  const db = getDb();
  if (!db) return [];
  return db.examAttempt.findMany({
    where: { status: { in: ["MANUAL_REVIEW", "MARKED_PENDING_CONFIRMATION", "SUBMITTED"] } },
    include: {
      exam: { select: { id: true, title: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
      answers: true,
    },
    orderBy: { submittedAt: "asc" },
    take: 50,
  });
}
