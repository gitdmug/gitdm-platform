import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getAuthSession } from "@/lib/auth-session";
import { bootstrapPrincipalIfConfigured, syncGITDMUser } from "@/lib/identity";
import { getDb } from "@/lib/db";
import type { PermissionKey, RoleCode } from "@/lib/permissions";

/**
 * Resolve the current Neon Auth session and the matching institutional account.
 *
 * User provisioning is best-effort after the initial account lookup. This
 * prevents an optional provisioning table from taking down every
 * authenticated route during a staged database rollout.
 */
const loadCachedUser = unstable_cache(
  async (authUserId: string) => {
    const database = getDb();
    if (!database) return null;
    return database.user.findUnique({
      where: { authUserId },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
        departments: { include: { department: true } },
      },
    });
  },
  ["gitdm-current-user"],
  { revalidate: 5 },
);

export const getCurrentUser = cache(async function getCurrentUser() {
  let session;
  try {
    session = await getAuthSession();
  } catch (error) {
    console.error("[GITDM access] Neon Auth session lookup failed:", error);
    return null;
  }
  if (!session?.user?.sub) return null;

  const db = getDb();
  if (!db) {
    console.error("[GITDM access] DATABASE_URL is not configured.");
    return null;
  }

  const authUserId = session.user.sub;
  const email = (session.user.email || "").trim().toLowerCase();

  const userInclude = {
    roles: {
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    },
    departments: { include: { department: true } },
  } as const;

  let user = await db.user.findUnique({
    where: { authUserId },
    include: userInclude,
  });

  // Legacy accounts: same email, different Neon Auth id — re-link without creating a duplicate.
  if (!user && email) {
    try {
      const byEmail = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: userInclude,
      });
      if (byEmail) {
        if (byEmail.authUserId !== authUserId) {
          try {
            user = await db.user.update({
              where: { id: byEmail.id },
              data: { authUserId },
              include: userInclude,
            });
            console.info(`[GITDM access] re-linked authUserId for ${email}`);
          } catch (linkErr) {
            console.warn("[GITDM access] authUserId re-link failed, using email match", linkErr);
            user = byEmail;
          }
        } else {
          user = byEmail;
        }
      }
    } catch (e) {
      console.warn("[GITDM access] email lookup failed", e);
    }
  }

  if (!user) {
    try {
      await syncGITDMUser(session);
    } catch (error) {
      console.error("[GITDM access] initial identity sync failed:", error);
      return null;
    }
    user = await db.user.findUnique({
      where: { authUserId },
      include: userInclude,
    });
    if (!user && email) {
      user = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: userInclude,
      });
    }
  }

  if (user) {
    try {
      const roleCodes = user.roles.map((r) => r.role.code);
      const changed = await bootstrapPrincipalIfConfigured(db, user.id, user.email, roleCodes);
      if (changed) {
        user = await db.user.findUnique({
          where: { id: user.id },
          include: userInclude,
        });
      }
    } catch (error) {
      console.error("[GITDM access] principal bootstrap check failed:", error);
    }
  }

  if (!user) return null;
  return user;
});

const STAFF_ROLE_LANDING: Record<string, string> = {
  PARENT: "/parent",
  GUARDIAN: "/parent",
  PRINCIPAL: "/staff/principal",
  ACADEMIC_DIRECTOR: "/staff/academic-director",
  REGISTRAR: "/staff/registrar",
  FACULTY: "/staff/faculty",
  LECTURER: "/staff/lecturer",
  ADMISSIONS: "/staff/admissions",
  FINANCE: "/staff/finance",
  EXAM_OFFICER: "/staff/exam-officer",
  STUDENT_AFFAIRS: "/staff/student-affairs",
  LIBRARY: "/staff/library",
  IT: "/staff/it",
  MARKETING: "/staff/marketing",
  PARTNER_SUPPORT: "/staff/partner-support",
  CURRICULUM_DEVELOPER: "/staff/faculty", ONLINE_INSTRUCTOR: "/staff/lecturer", DIFFERENTIATED_LEARNING_COORDINATOR: "/staff/academic-director",
  ACADEMIC_ADVISOR_REGISTRAR: "/staff/registrar", STUDENT_SUCCESS_COACH: "/staff/student-affairs", SCHOOL_COUNSELOR: "/staff/student-affairs",
  CTO_IT_DIRECTOR: "/staff/it", LMS_ADMINISTRATOR: "/staff/it", HELPDESK_TECHNICIAN: "/staff/it", OPERATIONS_COMPLIANCE_MANAGER: "/staff/operations", BURSAR_BILLING_SPECIALIST: "/staff/finance",
};

const STAFF_ROLE_PRIORITY = [
  "PRINCIPAL",
  "ACADEMIC_DIRECTOR",
  "REGISTRAR",
  "ADMISSIONS",
  "FINANCE",
  "FACULTY",
  "LECTURER",
  "EXAM_OFFICER",
  "STUDENT_AFFAIRS",
  "LIBRARY",
  "IT",
  "MARKETING",
  "PARTNER_SUPPORT", "CURRICULUM_DEVELOPER", "ONLINE_INSTRUCTOR", "DIFFERENTIATED_LEARNING_COORDINATOR", "ACADEMIC_ADVISOR_REGISTRAR", "STUDENT_SUCCESS_COACH", "SCHOOL_COUNSELOR", "CTO_IT_DIRECTOR", "LMS_ADMINISTRATOR", "HELPDESK_TECHNICIAN", "OPERATIONS_COMPLIANCE_MANAGER", "BURSAR_BILLING_SPECIALIST",
];

/**
 * Decide the first workspace after authentication. Staff roles always win over
 * STUDENT when an account has both roles. This is intentional: a staff member
 * must never be dropped into the student dashboard just because a STUDENT role
 * was provisioned earlier.
 */
export function getRoleLandingPath(roleCodes: string[]) {
  const staffRole = STAFF_ROLE_PRIORITY.find((role) => roleCodes.includes(role));
  if (staffRole) return STAFF_ROLE_LANDING[staffRole] || "/dashboard";

  // Applicants and students are routed through the unified dashboard
  // which inspects enrolment / application state and sends them to the
  // correct portal (applicant vs student).
  return "/dashboard";
}

export async function requirePermission(permission: PermissionKey) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const allowed = user.roles.some((r) =>
    r.role.permissions.some((p) => p.permission.key === permission),
  );
  if (!allowed) redirect("/campus?error=not-authorized");
  return user;
}

export async function requireRole(roleCode: RoleCode) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const allowed = user.roles.some((r) => r.role.code === roleCode);
  if (!allowed) redirect("/campus?error=not-authorized");
  return user;
}
