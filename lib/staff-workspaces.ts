import { normalizeRoleCode, type PermissionKey, type RoleCode } from "@/lib/permissions";

export type StaffNavItem = { href: string; label: string; permission?: PermissionKey };
export type StaffNavGroup = { label: string; items: StaffNavItem[] };

const item = (href: string, label: string, permission?: PermissionKey): StaffNavItem => ({
  href, label, permission,
});

const ROLE_GROUPS: Record<RoleCode, StaffNavGroup[]> = {
  PRINCIPAL: [
    {
      label: "COMMAND",
      items: [
        item("/control-centre", "Overview", "institution.view"),
        item("/control-centre/users", "People & departments", "users.view"),
        item("/control-centre/staff", "Staff register", "users.view"),
      ],
    },
    {
      label: "OVERSIGHT",
      items: [
        item("/control-centre/admissions", "Admissions", "applications.view"),
        item("/control-centre/finance", "Finance", "finance.view"),
        item("/control-centre/academic", "Academic", "academic.view"),
        item("/control-centre/exams", "Examinations", "exams.manage"),
        item("/control-centre/results", "Results", "results.moderate"),
        item("/staff/registrar/students", "Student register", "students.view"),
      ],
    },
    {
      label: "INSIGHTS",
      items: [
        item("/control-centre", "Institution metrics", "reports.view"),
        item("/campus/tools", "Market tools (campus)", "reports.view"),
      ],
    },
  ],
  ADMISSIONS: [
    {
      label: "APPLICATIONS",
      items: [
        item("/staff/admissions", "Dashboard", "applications.view"),
        item("/staff/admissions/applications", "Application queue", "applications.view"),
      ],
    },
  ],
  FINANCE: [
    {
      label: "FEE CLEARANCE",
      items: [
        item("/staff/finance", "Dashboard", "finance.view"),
        item("/staff/finance/payments", "Payment queue", "payments.verify"),
        item("/staff/finance/invoices", "Invoices", "finance.view"),
        item("/staff/finance/reconciliation", "Reconciliation", "finance.reconcile"),
        item("/staff/finance/reports", "Reports", "reports.view"),
      ],
    },
  ],
  ACADEMIC_DIRECTOR: [
    {
      label: "TEACHING",
      items: [
        item("/staff/academic", "Dashboard", "academic.view"),
        item("/staff/academic/classes", "Classes (24h)", "academic.manage"),
        item("/staff/academic/courses", "Courses & modules", "courses.view"),
        item("/staff/academic/assessments", "Coursework & quizzes", "assignments.manage"),
        item("/staff/lecturer/assessments", "Set assessments", "assignments.manage"),
        item("/staff/academic/delivery", "Timetable generation", "academic.manage"),
        item("/staff/academic/students", "Active students", "students.view"),
      ],
    },
  ],
  EXAM_OFFICER: [
    {
      label: "EXAMINATIONS",
      items: [
        item("/staff/exam-officer", "Dashboard", "exams.manage"),
        item("/staff/exam-officer/exams", "Exam papers", "exams.manage"),
        item("/staff/exam-officer/results", "Results publication", "results.publish"),
      ],
    },
  ],
  REGISTRAR: [
    {
      label: "REGISTRY",
      items: [
        item("/staff/registrar", "Dashboard", "students.view"),
        item("/staff/registrar/students", "Student register", "students.view"),
        item("/staff/registrar/records", "Academic records", "academic.view"),
        item("/staff/registrar/records/results", "Final results", "results.moderate"),
      ],
    },
  ],
  STUDENT: [],
  ALUMNI: [],
};

export function getStaffNav(roleCodes: string[], _departmentNames?: string[]): StaffNavGroup[] {
  const normalized = roleCodes.map(normalizeRoleCode).filter(Boolean) as RoleCode[];
  const primary = normalized[0];
  if (!primary || !ROLE_GROUPS[primary]) return [];
  return ROLE_GROUPS[primary];
}

export const ROLE_HOME: Record<RoleCode, string> = {
  PRINCIPAL: "/control-centre",
  ADMISSIONS: "/staff/admissions",
  FINANCE: "/staff/finance",
  ACADEMIC_DIRECTOR: "/staff/academic",
  EXAM_OFFICER: "/staff/exam-officer",
  REGISTRAR: "/staff/registrar",
  STUDENT: "/campus",
  ALUMNI: "/campus/alumni",
};

export function routeForRoles(roleCodes: string[]): string | null {
  const priority: RoleCode[] = [
    "PRINCIPAL", "ADMISSIONS", "FINANCE", "ACADEMIC_DIRECTOR", "EXAM_OFFICER", "REGISTRAR",
  ];
  for (const code of priority) {
    if (roleCodes.some((r) => normalizeRoleCode(r) === code)) return ROLE_HOME[code];
  }
  if (roleCodes.some((r) => normalizeRoleCode(r) === "STUDENT")) return ROLE_HOME.STUDENT;
  if (roleCodes.some((r) => normalizeRoleCode(r) === "ALUMNI")) return ROLE_HOME.ALUMNI;
  return null;
}
