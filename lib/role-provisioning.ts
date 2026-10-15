import type { PrismaClient } from "@/generated/prisma/client";
import { ROLE_CODES, ROLE_PERMISSION_PRESETS, type RoleCode, LEGACY_ROLE_ALIASES } from "@/lib/permissions";

const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  PRINCIPAL: "Institutional oversight. Sees every department; does not process day-to-day work.",
  ADMISSIONS: "Applications, interviews, admission decisions. Hands accepted students to Finance.",
  FINANCE: "Payment verification and fee clearance. Unlocks FULL learning access.",
  ACADEMIC_DIRECTOR: "Teaching, classes, coursework and quizzes. Formal exams belong to Exam Office.",
  EXAM_OFFICER: "Formal examinations, marking and publication of results.",
  REGISTRAR: "Permanent academic record, completion, transcripts and certificates.",
  STUDENT: "Learner access to campus services according to enrolment and fee status.",
  ALUMNI: "Access to transcripts and certificates after completion.",
};

const ROLE_DEPARTMENTS: Partial<Record<RoleCode, string>> = {
  ADMISSIONS: "Admissions",
  FINANCE: "Finance",
  ACADEMIC_DIRECTOR: "Academic Affairs",
  EXAM_OFFICER: "Examinations Office",
  REGISTRAR: "Registry",
};

const ACTIVE_OPERATIONAL_ROLES = new Set<RoleCode>([
  "PRINCIPAL", "ADMISSIONS", "FINANCE", "ACADEMIC_DIRECTOR", "EXAM_OFFICER", "REGISTRAR", "STUDENT", "ALUMNI",
]);

const PRISMA_ROLE_CODES = new Set([
  "PRINCIPAL", "ACADEMIC_DIRECTOR", "REGISTRAR", "FACULTY", "LECTURER", "ADMISSIONS", "FINANCE",
  "EXAM_OFFICER", "STUDENT_AFFAIRS", "LIBRARY", "IT", "MARKETING", "PARTNER_SUPPORT",
  "ADMISSIONS_DIRECTOR", "ADMISSIONS_COUNSELOR", "ONBOARDING_TECH_SUPPORT", "CURRICULUM_DEVELOPER",
  "ONLINE_INSTRUCTOR", "DIFFERENTIATED_LEARNING_COORDINATOR", "STUDENT_SUCCESS_COACH",
  "ACADEMIC_ADVISOR_REGISTRAR", "SCHOOL_COUNSELOR", "CTO_IT_DIRECTOR", "LMS_ADMINISTRATOR",
  "HELPDESK_TECHNICIAN", "OPERATIONS_COMPLIANCE_MANAGER", "BURSAR_BILLING_SPECIALIST",
  "PARENT_GUARDIAN", "ALUMNI", "STUDENT",
]);

export async function ensureInstitutionalRoles(db: PrismaClient): Promise<Map<RoleCode, { id: string }>> {
  const roles = new Map<RoleCode, { id: string }>();

  const allKeys = [...new Set(Object.values(ROLE_PERMISSION_PRESETS).flat())];
  for (const key of allKeys) {
    await db.permission.upsert({
      where: { key },
      update: {},
      create: { key, name: key.replaceAll(".", " ") },
    });
  }

  for (const code of ROLE_CODES) {
    const role = await db.role.upsert({
      where: { code: code as any },
      update: {
        name: code === "ACADEMIC_DIRECTOR" ? "Academic" : code.replaceAll("_", " "),
        description: ROLE_DESCRIPTIONS[code],
        isActive: ACTIVE_OPERATIONAL_ROLES.has(code),
        ...(code === "PRINCIPAL" ? { departmentId: null } : {}),
      },
      create: {
        code: code as any,
        name: code === "ACADEMIC_DIRECTOR" ? "Academic" : code.replaceAll("_", " "),
        description: ROLE_DESCRIPTIONS[code],
        isActive: ACTIVE_OPERATIONAL_ROLES.has(code),
      },
      select: { id: true },
    });

    const departmentName = ROLE_DEPARTMENTS[code];
    if (code !== "PRINCIPAL" && departmentName) {
      const department = await db.department.upsert({
        where: { name: departmentName },
        update: {},
        create: { name: departmentName },
      });
      await db.role.update({ where: { id: role.id }, data: { departmentId: department.id } });
    }

    const preset = ROLE_PERMISSION_PRESETS[code] || [];
    const permissions = await db.permission.findMany({ where: { key: { in: [...preset] } } });
    for (const perm of permissions) {
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
    roles.set(code, role);
  }

  const legacyCodes = Object.keys(LEGACY_ROLE_ALIASES).filter((code) => PRISMA_ROLE_CODES.has(code));
  if (legacyCodes.length) {
    await db.role.updateMany({
      where: { code: { in: legacyCodes as any } },
      data: { isActive: false },
    });
  }

  console.log("Institutional roles normalised to six operational roles + student/alumni.");
  return roles;
}

export function isStaffRole(code: string): boolean {
  const staff = new Set([
    "PRINCIPAL", "ADMISSIONS", "FINANCE", "ACADEMIC_DIRECTOR", "EXAM_OFFICER", "REGISTRAR",
    "FACULTY", "LECTURER", "CURRICULUM_DEVELOPER", "ONLINE_INSTRUCTOR",
    "DIFFERENTIATED_LEARNING_COORDINATOR", "LMS_ADMINISTRATOR", "LIBRARY",
    "ACADEMIC_ADVISOR_REGISTRAR", "STUDENT_SUCCESS_COACH", "SCHOOL_COUNSELOR", "STUDENT_AFFAIRS",
    "BURSAR_BILLING_SPECIALIST", "CTO_IT_DIRECTOR", "HELPDESK_TECHNICIAN",
    "OPERATIONS_COMPLIANCE_MANAGER", "IT", "MARKETING", "PARTNER_SUPPORT",
    "ADMISSIONS_DIRECTOR", "ADMISSIONS_COUNSELOR", "ONBOARDING_TECH_SUPPORT",
  ]);
  return staff.has(code);
}
