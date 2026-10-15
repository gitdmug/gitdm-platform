export type DeliverySession = "MORNING" | "EVENING";

/** Teaching days aligned with published intake patterns. */
export const SHORT_COURSE_SCHEDULES = {
  TA101: {
    durationMonths: 1,
    days: [2, 4, 5], // Tuesday, Thursday, Friday
    morning: ["09:00", "11:00"],
    evening: ["17:00", "19:00"],
  },
  FX3M: {
    durationMonths: 3,
    days: [1, 3], // Monday, Wednesday
    morning: ["09:00", "11:00"],
    evening: ["17:00", "19:00"],
  },
} as const;

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function scheduleForCourse(code: string) {
  return SHORT_COURSE_SCHEDULES[code as keyof typeof SHORT_COURSE_SCHEDULES] ?? null;
}

export function addCalendarMonths(date: Date, months: number) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function makeKampalaDate(date: Date, time: string) {
  return new Date(`${isoDate(date)}T${time}:00+03:00`);
}

/**
 * Assessment checkpoints at every third of the programme, plus final exam after last class.
 * Example: 12 classes → assessments near class 4 and class 8; exam after class 12.
 */
export function deriveAssessmentWindows(classDates: Date[]) {
  if (!classDates.length) {
    return { assessments: [] as Date[], examDate: null as Date | null, examUploadDeadline: null as Date | null };
  }
  const sorted = [...classDates].sort((a, b) => a.getTime() - b.getTime());
  const n = sorted.length;
  const third = Math.max(1, Math.floor(n / 3));
  const assessments: Date[] = [];
  if (n >= 3) {
    assessments.push(sorted[third - 1]);
    if (third * 2 <= n) assessments.push(sorted[third * 2 - 1]);
  } else if (n >= 1) {
    assessments.push(sorted[Math.floor(n / 2)]);
  }
  const last = sorted[n - 1];
  const examDate = new Date(last);
  examDate.setUTCDate(examDate.getUTCDate() + 3);
  const examUploadDeadline = new Date(examDate);
  examUploadDeadline.setUTCDate(examUploadDeadline.getUTCDate() - 7);
  return { assessments, examDate, examUploadDeadline };
}
