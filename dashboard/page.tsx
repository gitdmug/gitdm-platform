import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { acceptPendingInvitationsForUser } from "@/lib/staff-invite";
import { getDb } from "@/lib/db";

/**
 * Single post-login entry point.
 * Routes the user to the correct portal based on roles and academic status.
 * Students / applicants never land on staff workspaces.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/dashboard");

  // Accept any pending staff invitations for this email
  try {
    await acceptPendingInvitationsForUser(user.id, user.email);
  } catch {
    // non-blocking
  }

  // Re-load roles if invitation just applied
  const refreshed = await getCurrentUser();
  const effectiveUser = refreshed || user;

  const roleCodes = (effectiveUser.roles || user.roles || []).map((r: any) => r.role?.code || r.roleCode).filter(Boolean);
  const isStaff = roleCodes.some((c: string) =>
    ["PRINCIPAL", "ADMISSIONS", "FINANCE", "ACADEMIC_DIRECTOR", "EXAM_OFFICER", "REGISTRAR", "LECTURER", "STUDENT_AFFAIRS", "IT", "LIBRARY", "MARKETING"].includes(c)
  );
  const isStudentRole = roleCodes.includes("STUDENT") || roleCodes.includes("ALUMNI");

  // Staff with any operational role → Control Centre / first workspace
  if (isStaff) {
    if (roleCodes.includes("ADMISSIONS") || roleCodes.includes("ADMISSIONS_DIRECTOR") || roleCodes.includes("ADMISSIONS_COUNSELOR")) {
      redirect("/staff/admissions");
    }
    if (roleCodes.includes("FINANCE") || roleCodes.includes("BURSAR_BILLING_SPECIALIST")) {
      redirect("/staff/finance");
    }
    if (roleCodes.includes("PRINCIPAL")) {
      redirect("/staff/principal");
    }
    if (roleCodes.includes("ACADEMIC_DIRECTOR") || roleCodes.includes("LECTURER") || roleCodes.includes("FACULTY")) {
      redirect("/staff/academic");
    }
    if (roleCodes.includes("REGISTRAR")) {
      redirect("/staff/registrar");
    }
    if (roleCodes.includes("EXAM_OFFICER")) {
      redirect("/staff/exams");
    }
    if (roleCodes.includes("STUDENT_AFFAIRS")) {
      redirect("/staff/student-affairs");
    }
    // Generic staff landing
    redirect("/staff");
  }

  if (roleCodes.includes("PARENT") || roleCodes.includes("GUARDIAN")) {
    redirect("/parent");
  }

  // Applicant or student path
  const db = getDb();
  if (db) {
    const activeEnrollment = await db.enrollment.findFirst({
      where: {
        userId: user.id,
        status: { in: ["ACTIVE", "REPEATING", "PENDING"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (activeEnrollment || isStudentRole) {
      redirect("/student");
    }

    const completedEnrollment = await db.enrollment.findFirst({
      where: { userId: user.id, status: "COMPLETED" },
    });
    if (completedEnrollment || roleCodes.includes("ALUMNI")) {
      redirect("/alumni");
    }

    const openApp = await db.application.findFirst({
      where: {
        applicantId: user.id,
        status: {
          notIn: ["REJECTED", "WITHDRAWN"],
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (openApp) {
      redirect("/applicant");
    }
  }

  // New user with no application yet
  redirect("/admissions/apply");
}
