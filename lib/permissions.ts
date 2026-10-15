/**
 * GITDM permissions and roles.
 * Six operational roles are active; full permission key list is kept so existing
 * pages that still reference secondary keys type-check and can be gated later.
 */
export const ROLE_CODES = [
  "PRINCIPAL",
  "ADMISSIONS",
  "FINANCE",
  "ACADEMIC_DIRECTOR",
  "EXAM_OFFICER",
  "REGISTRAR",
  "STUDENT",
  "ALUMNI",
] as const;

export type RoleCode = (typeof ROLE_CODES)[number];

export const ROLE_DISPLAY_NAME: Record<RoleCode, string> = {
  PRINCIPAL: "Principal",
  ADMISSIONS: "Admissions",
  FINANCE: "Finance",
  ACADEMIC_DIRECTOR: "Academic",
  EXAM_OFFICER: "Exam Office",
  REGISTRAR: "Registrar",
  STUDENT: "Student",
  ALUMNI: "Alumni",
};

export const PERMISSIONS = [
  "institution.view",
  "users.view",
  "users.manage",
  "audit.view",
  "reports.view",
  "applications.view",
  "applications.review",
  "applications.manage",
  "applications.decide",
  "applications.issue_offer",
  "enrollments.manage",
  "finance.view",
  "finance.manage",
  "payments.verify",
  "finance.reconcile",
  "finance.claims.submit",
  "finance.claims.review",
  "finance.vendors.manage",
  "finance.aid.manage",
  "finance.budget.approve",
  "finance.payroll.view",
  "finance.payroll.manage",
  "academic.view",
  "academic.manage",
  "programmes.view",
  "programmes.manage",
  "courses.view",
  "courses.manage",
  "lessons.manage",
  "assignments.manage",
  "assignments.grade",
  "quizzes.manage",
  "attendance.manage",
  "attendance.view",
  "students.view",
  "students.manage",
  "exams.manage",
  "exams.mark",
  "results.publish",
  "results.moderate",
  "results.correct",
  "transcripts.view",
  "certificates.view",
  "certificates.manage",
  "support.view",
  "support.create",
  "support.manage",
  "library.manage",
  "student-affairs.manage",
  "it.manage",
  "marketing.view",
  "marketing.manage",
  "partners.view",
  "partners.manage",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSION_PRESETS: Record<RoleCode, PermissionKey[]> = {
  PRINCIPAL: [
    "institution.view", "users.view", "users.manage", "audit.view", "reports.view",
    "applications.view", "finance.view", "finance.budget.approve", "finance.payroll.view",
    "academic.view", "exams.manage", "results.moderate", "students.view",
    "transcripts.view", "certificates.view", "programmes.view", "courses.view",
    "support.view", "marketing.view", "partners.view", "library.manage",
    "student-affairs.manage", "it.manage",
  ],
  ADMISSIONS: [
    "applications.view", "applications.review", "applications.manage",
    "applications.decide", "applications.issue_offer", "enrollments.manage",
    "students.view", "reports.view",
  ],
  FINANCE: [
    "finance.view", "finance.manage", "payments.verify", "finance.reconcile",
    "finance.claims.submit", "finance.claims.review", "finance.vendors.manage",
    "finance.aid.manage", "finance.payroll.view", "finance.payroll.manage",
    "students.view", "reports.view",
  ],
  ACADEMIC_DIRECTOR: [
    "academic.view", "academic.manage", "programmes.view", "programmes.manage",
    "courses.view", "courses.manage", "lessons.manage",
    "assignments.manage", "assignments.grade", "quizzes.manage",
    "attendance.manage", "attendance.view", "students.view", "reports.view",
    "finance.claims.submit", "library.manage",
  ],
  EXAM_OFFICER: [
    "exams.manage", "exams.mark", "results.publish", "results.moderate",
    "courses.view", "students.view", "academic.view", "reports.view",
    "finance.claims.submit",
  ],
  REGISTRAR: [
    "students.view", "students.manage", "academic.view", "attendance.view",
    "transcripts.view", "certificates.view", "certificates.manage",
    "results.moderate", "results.correct", "programmes.view", "courses.view",
    "reports.view", "finance.claims.submit", "student-affairs.manage", "support.manage",
  ],
  STUDENT: [
    "courses.view", "academic.view", "transcripts.view", "certificates.view",
    "support.view", "support.create",
  ],
  ALUMNI: ["transcripts.view", "certificates.view"],
};

export const LEGACY_ROLE_ALIASES: Record<string, RoleCode> = {
  ACADEMIC: "ACADEMIC_DIRECTOR",
  FACULTY: "ACADEMIC_DIRECTOR",
  LECTURER: "ACADEMIC_DIRECTOR",
  CURRICULUM_DEVELOPER: "ACADEMIC_DIRECTOR",
  ONLINE_INSTRUCTOR: "ACADEMIC_DIRECTOR",
  DIFFERENTIATED_LEARNING_COORDINATOR: "ACADEMIC_DIRECTOR",
  LMS_ADMINISTRATOR: "ACADEMIC_DIRECTOR",
  LIBRARY: "ACADEMIC_DIRECTOR",
  ACADEMIC_ADVISOR_REGISTRAR: "REGISTRAR",
  STUDENT_SUCCESS_COACH: "REGISTRAR",
  SCHOOL_COUNSELOR: "REGISTRAR",
  STUDENT_AFFAIRS: "REGISTRAR",
  BURSAR_BILLING_SPECIALIST: "FINANCE",
  CTO_IT_DIRECTOR: "PRINCIPAL",
  HELPDESK_TECHNICIAN: "PRINCIPAL",
  OPERATIONS_COMPLIANCE_MANAGER: "PRINCIPAL",
  IT: "PRINCIPAL",
  MARKETING: "PRINCIPAL",
  PARTNER_SUPPORT: "PRINCIPAL",
};

export function normalizeRoleCode(code: string): RoleCode | null {
  if ((ROLE_CODES as readonly string[]).includes(code)) return code as RoleCode;
  return LEGACY_ROLE_ALIASES[code] ?? null;
}
