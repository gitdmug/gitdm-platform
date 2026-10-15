import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import {
  ROLE_PERMISSION_PRESETS,
  normalizeRoleCode,
  type PermissionKey,
  type RoleCode,
} from "@/lib/permissions";
import { getActingRole } from "@/lib/staff-acting";
import { getActiveStaffRole } from "@/lib/staff-role-context";

function permissionsForRoleCode(code: string): PermissionKey[] {
  const normalized = normalizeRoleCode(code);
  if (normalized) return ROLE_PERMISSION_PRESETS[normalized] ?? [];
  return ROLE_PERMISSION_PRESETS[code as RoleCode] ?? [];
}

function userHasPermission(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  permission: PermissionKey
): boolean {
  return user.roles.some((r) => {
    const dbPermissions = r.role.permissions.map((p) => p.permission.key as PermissionKey);
    const presetPermissions = permissionsForRoleCode(r.role.code);
    return new Set([...presetPermissions, ...dbPermissions]).has(permission);
  });
}

/** Principal-only Control Centre. */
export async function requireStaffUser(permission?: PermissionKey) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/control-centre");

  const db = getDb();
  if (!db) redirect("/campus?error=database-unavailable");

  const actualRoleCodes = user.roles
    .map((r) => r.role.code)
    .filter((c) => c !== "STUDENT" && c !== "PARENT_GUARDIAN" && c !== "ALUMNI");

  const isPrincipal = actualRoleCodes.some(
    (c) => c === "PRINCIPAL" || normalizeRoleCode(c) === "PRINCIPAL"
  );

  // Control Centre is Principal only — department staff use /staff/*
  if (!isPrincipal) {
    redirect("/staff?error=control-centre-principal-only");
  }

  const actingRole = await getActingRole();
  const selectedRole = await getActiveStaffRole();
  const roleCodes = actingRole
    ? Array.from(new Set([...actualRoleCodes, actingRole]))
    : selectedRole && (actualRoleCodes as string[]).includes(selectedRole as string)
      ? [selectedRole]
      : actualRoleCodes;

  const actualPermissionKeys = new Set<PermissionKey>();
  for (const userRole of user.roles) {
    for (const key of permissionsForRoleCode(userRole.role.code)) {
      actualPermissionKeys.add(key);
    }
    for (const p of userRole.role.permissions) {
      actualPermissionKeys.add(p.permission.key as PermissionKey);
    }
  }

  // Principal always has full institutional view
  for (const key of ROLE_PERMISSION_PRESETS.PRINCIPAL) {
    actualPermissionKeys.add(key);
  }

  let effectivePermissionKeys = actualPermissionKeys;
  if (actingRole) {
    effectivePermissionKeys = new Set(permissionsForRoleCode(actingRole));
  }

  if (permission && !userHasPermission(user, permission) && !actualPermissionKeys.has(permission)) {
    // Principal with institution.view still allowed into CC pages
    if (!(isPrincipal && permission === "institution.view") && !isPrincipal) {
      redirect("/staff?error=not-authorized");
    }
  }

  return {
    user,
    db,
    roleCodes: roleCodes as RoleCode[],
    actingRole,
    effectivePermissionKeys,
    isPrincipal: true,
  };
}

/** Department staff operational gate — uses normalized role presets. */
export async function requireOperationalStaffUser(permission?: PermissionKey) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  const db = getDb();
  if (!db) redirect("/campus?error=database-unavailable");

  const roleCodes = user.roles
    .map((r) => r.role.code)
    .filter((c) => c !== "STUDENT");

  const isStaff = roleCodes.some((c) => {
    const n = normalizeRoleCode(c);
    return n && n !== "STUDENT" && n !== "ALUMNI";
  }) || roleCodes.some((c) => !["PARENT_GUARDIAN", "ALUMNI", "STUDENT"].includes(c));

  if (!isStaff) redirect("/campus?error=not-authorized");

  if (permission) {
    const allowed = userHasPermission(user, permission);
    // Principal can operate any staff workspace
    const isPrincipal = roleCodes.includes("PRINCIPAL");
    if (!allowed && !isPrincipal) {
      redirect("/staff?error=not-authorized");
    }
  }

  return { user, db, roleCodes: roleCodes as RoleCode[] };
}

export async function getInstitutionSnapshot(db: NonNullable<ReturnType<typeof getDb>>) {
  if (!db) {
    return {
      totals: {
        activeEnrollments: 0,
        limitedAccess: 0,
        submittedApplications: 0,
        invoices: 0,
        paidInvoices: 0,
        publishedProgrammes: 0,
        programmes: 0,
        users: 0,
        openTickets: 0,
      },
    };
  }
  const [
    activeEnrollments,
    limitedAccess,
    submittedApplications,
    invoices,
    paidInvoices,
    publishedProgrammes,
    programmes,
    users,
    openTickets,
  ] = await Promise.all([
    db.enrollment.count({ where: { status: { in: ["ACTIVE", "REPEATING"] } } }),
    db.enrollment.count({ where: { status: { in: ["ACTIVE", "REPEATING"] }, accessLevel: "LIMITED" } }),
    db.application.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "ADDITIONAL_INFORMATION"] } },
    }),
    db.invoice.count(),
    db.invoice.count({ where: { status: { in: ["PAID", "PARTIALLY_PAID"] } } }),
    db.programme.count({ where: { status: "PUBLISHED" } }),
    db.programme.count(),
    db.user.count(),
    db.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } } }).catch(() => 0),
  ]);
  return {
    totals: {
      activeEnrollments,
      limitedAccess,
      submittedApplications,
      invoices,
      paidInvoices,
      publishedProgrammes,
      programmes,
      users,
      openTickets,
    },
  };
}
