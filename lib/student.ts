import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth-session";
import { syncGITDMUser } from "@/lib/identity";
import { getDb } from "@/lib/db";
import { ACTIVE_COURSE_CODES } from "@/lib/current-catalogue";

export type StudentContext = {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    status: string;
  };
  displayName: string;
  roleCodes: string[];
  isStaff: boolean;
  applications: {
    id: string;
    status: string;
    programme: { id: string; name: string; code: string };
    submittedAt: Date | null;
  }[];
  enrollments: {
    id: string;
    programmeId: string;
    periodId: string | null;
    status: string;
    accessLevel: string;
    financialClearanceOverride: boolean;
    programme: { id: string; name: string; code: string; shortName: string | null; durationMonths: number };
    period: {
      id: string;
      name: string;
      feeAmount: { toString(): string };
      currency: string;
    } | null;
    invoices: {
      id: string;
      periodId: string | null;
      invoiceNo: string;
      dueAt: Date | null;
      paymentPreference: string | null;
      amount: { toString(): string };
      amountPaid: { toString(): string };
      currency: string;
      status: string;
      description: string;
    }[];
  }[];
  primaryEnrollment: StudentContext["enrollments"][0] | null;
  accessLevel: "NONE" | "LIMITED" | "FULL" | "RESTRICTED";
  feePercentPaid: number;
  financialClearanceOverride: boolean;
  activationThreshold: number;
  canAccessLearning: boolean;
  canAccessExams: boolean;
};


export async function getAuthoritativeEnrollmentCourseIds(
  db: any,
  enrollment: { programmeId: string; periodId: string | null },
): Promise<string[]> {
  const programmeCourses = await db.course.findMany({
    where: { programmeId: enrollment.programmeId, code: { in: [...ACTIVE_COURSE_CODES] }, published: true },
    select: { id: true },
  });
  const programmeCourseIds = new Set<string>(programmeCourses.map((course: { id: string }) => course.id));

  // A period is the authoritative cohort/intake boundary. Only courses linked
  // to that period AND belonging to the enrolled programme are eligible. This
  // prevents stale/manual CourseEnrollment rows from leaking another
  // programme's classes into the student's timetable, learning or assessments.
  if (enrollment.periodId) {
    const periodLinks = await db.periodCourse.findMany({
      where: { periodId: enrollment.periodId },
      select: { courseId: true },
    });
    const periodCourseIds = periodLinks
      .map((link: { courseId: string }) => link.courseId)
      .filter((courseId: string) => programmeCourseIds.has(courseId));
    if (periodCourseIds.length) return Array.from(new Set(periodCourseIds));
  }

  return Array.from(programmeCourseIds);
}

export async function requireStudentSession(returnTo = "/campus"): Promise<StudentContext> {
  let session;
  try {
    session = await getAuthSession();
  } catch (error) {
    console.error("[GITDM student] Neon Auth session lookup failed:", error);
    redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (!session?.user?.sub) {
    return redirect(`/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (!session.user.emailVerified) {
    return redirect(`/auth/verify-email?returnTo=${encodeURIComponent(returnTo)}`);
  }

  try {
    await syncGITDMUser(session);
  } catch (error) {
    console.error("[GITDM student] identity sync failed; using existing user:", error);
  }
  const db = getDb();
  if (!db) {
    redirect("/campus/error?code=database-unavailable");
  }

  // Load the authenticated institutional account in independent layers.
  // A failure in an optional relation (applications, enrollments, roles, etc.)
  // must never redirect back to /campus, because that creates an infinite
  // redirect loop and hides the real problem from the user.
  let user: any = null;
  let lastUserLoadError: unknown = null;

  // A new Neon Auth identity and the application-side institutional record can
  // briefly arrive out of order. Retry once, then repair by email if the auth
  // id was not attached yet. This prevents a valid first login from landing on
  // the generic "could not open Campus" screen.
  for (let attempt = 0; attempt < 2 && !user; attempt += 1) {
    try {
      user = await db.user.findUnique({ where: { authUserId: session.user.sub } });
      if (!user) {
        user = await db.user.findFirst({
          where: { email: { equals: session.user.email, mode: "insensitive" } },
        });
        if (user && user.authUserId !== session.user.sub) {
          user = await db.user.update({
            where: { id: user.id },
            data: { authUserId: session.user.sub },
          });
        }
      }
    } catch (error) {
      lastUserLoadError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  if (!user) {
    try {
      const repaired = await syncGITDMUser(session);
      if (repaired) user = await db.user.findUnique({ where: { id: repaired.id } });
    } catch (error) {
      lastUserLoadError = error;
      console.error("[GITDM student] institutional account repair failed:", error);
    }
  }

  if (!user) {
    console.error("[GITDM student] base user could not be resolved", lastUserLoadError);
    redirect(lastUserLoadError ? "/campus/error?code=account-load" : `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  let roles: Array<{ role: { code: string } }> = [];
  try {
    roles = await db.userRole.findMany({
      where: { userId: user.id },
      include: { role: true },
    });
  } catch (error) {
    console.error("[GITDM student] role lookup skipped:", error);
  }

  let applications: any[] = [];
  try {
    applications = await db.application.findMany({
      where: { applicantId: user.id },
      orderBy: { submittedAt: "desc" },
      include: {
        programme: { select: { id: true, name: true, code: true } },
      },
    });
  } catch (error) {
    console.error("[GITDM student] application lookup skipped:", error);
  }

  let enrollments: any[] = [];
  try {
    enrollments = await db.enrollment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        programme: {
          select: { id: true, name: true, code: true, shortName: true, durationMonths: true },
        },
        period: true,
        invoices: { orderBy: { dueAt: "asc" } },
      },
    });
  } catch (error) {
    console.error("[GITDM student] enrollment lookup skipped:", error);
  }

  const roleCodes = roles.map((r) => r.role.code);
  const isStaff = roleCodes.some(
    (c) => c !== "STUDENT" && c !== "PARENT_GUARDIAN" && c !== "ALUMNI",
  );

  // A PENDING enrollment can exist only as an application/fee container. It is
  // not a running programme and must never replace the student's current course
  // on the dashboard. Active/repeating is the authoritative running programme.
  const runningEnrollments = enrollments.filter((e: any) => ["ACTIVE", "REPEATING"].includes(e.status));
  // If the 12-month + one-short-course exception is being used, keep the
  // 12-month programme as the dashboard anchor so a short course never
  // replaces the student's main programme or fee-unlock state.
  const primaryEnrollment = runningEnrollments.sort((a: any, b: any) => {
    const durationDiff = Number(b.programme?.durationMonths || 0) - Number(a.programme?.durationMonths || 0);
    return durationDiff || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  })[0] ?? null;
  let feePercentPaid = 0;
  let activationThreshold = 60;

  if (primaryEnrollment) {
    const invoices = (primaryEnrollment.invoices as any[]).filter(
      (i: any) =>
        (!primaryEnrollment.periodId ||
          i.periodId === primaryEnrollment.periodId) &&
        !["DRAFT", "VOID"].includes(i.status),
    );
    const paid = invoices.reduce(
      (sum: number, invoice: any) => sum + Number(invoice.amountPaid),
      0,
    );
    const periodFee = Number(primaryEnrollment.period?.feeAmount || 0);
    const billed =
      periodFee > 0
        ? periodFee
        : invoices.reduce(
            (sum: number, invoice: any) => sum + Number(invoice.amount),
            0,
          );
    feePercentPaid =
      billed > 0 ? Math.min(100, Math.round((paid / billed) * 1000) / 10) : 0;
  }

  const accessLevel = !primaryEnrollment
    ? "NONE"
    : (primaryEnrollment.accessLevel as "LIMITED" | "FULL" | "RESTRICTED");

  const canAccessLearning =
    (accessLevel === "FULL" &&
      ["ACTIVE", "REPEATING"].includes(primaryEnrollment?.status ?? "")) ||
    isStaff;
  const canAccessExams =
    ((accessLevel === "FULL" && feePercentPaid >= 100) ||
      Boolean(primaryEnrollment?.financialClearanceOverride)) &&
      ["ACTIVE", "REPEATING"].includes(primaryEnrollment?.status ?? "") ||
    isStaff;

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email.split("@")[0] ||
    "Student";

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      status: user.status,
    },
    displayName,
    roleCodes,
    isStaff,
    applications: applications.map((a: any) => ({
      id: a.id,
      status: a.status,
      programme: a.programme,
      submittedAt: a.submittedAt,
    })),
    enrollments: enrollments.map((e: any) => ({
      id: e.id,
      programmeId: e.programmeId,
      periodId: e.periodId,
      status: e.status,
      accessLevel: e.accessLevel,
      financialClearanceOverride: e.financialClearanceOverride,
      programme: e.programme,
      period: e.period,
      invoices: e.invoices,
    })),
    primaryEnrollment,
    accessLevel,
    financialClearanceOverride: Boolean(
      primaryEnrollment?.financialClearanceOverride,
    ),
    feePercentPaid,
    activationThreshold,
    canAccessLearning,
    canAccessExams,
  };
}
