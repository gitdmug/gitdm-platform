import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/access";

/**
 * Shared-database legacy bridge.
 *
 * The old six-roles platform and this Campus platform use the same Prisma
 * schema and the same Neon Postgres. There is no second database to sync.
 *
 * What *does* change across auth systems is `User.authUserId` (Neon Auth id).
 * When a legacy student signs in with the new Neon Auth account for the same
 * email, getCurrentUser() already re-links authUserId. This module adds:
 *
 * 1. reportLegacyPipeline() — list applications / paid enrollments still live
 * 2. ensureLegacyUserLinked(email, authUserId) — explicit re-link helper
 * 3. countOperationalGaps() — what is missing for full ops
 *
 * New applications write only to the existing Application / Enrollment /
 * Invoice tables (new rows). No parallel "legacy_*" tables are required.
 */

export type LegacyPipelineRow = {
  applicationId: string;
  status: string;
  applicantEmail: string;
  applicantName: string;
  programmeName: string;
  submittedAt: Date | null;
  hasAuthLink: boolean;
  enrollmentStatus: string | null;
  paidAmount: number;
  invoiceStatus: string | null;
};

export async function reportLegacyPipeline(limit = 200): Promise<LegacyPipelineRow[]> {
  const db = getDb();
  if (!db) return [];

  const apps = await db.application.findMany({
    where: {
      status: {
        in: [
          "DRAFT",
          "SUBMITTED",
          "UNDER_REVIEW",
          "INTERVIEW",
          "OFFERED",
          "ACCEPTED",
          "ENROLLED",
          "APPEALED",
        ],
      },
    },
    include: {
      applicant: { select: { email: true, firstName: true, lastName: true, authUserId: true } },
      programme: { select: { name: true } },
      feeInvoice: { select: { status: true, amount: true, amountPaid: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: limit,
  });

  const rows: LegacyPipelineRow[] = [];
  for (const app of apps) {
    const enrollment = await db.enrollment.findFirst({
      where: { userId: app.applicantId, programmeId: app.programmeId },
      select: { status: true },
      orderBy: { createdAt: "desc" },
    });
    const paid = Number(app.feeInvoice?.amountPaid ?? 0);
    rows.push({
      applicationId: app.id,
      status: app.status,
      applicantEmail: app.applicant.email,
      applicantName: [app.applicant.firstName, app.applicant.lastName].filter(Boolean).join(" ") || app.applicant.email,
      programmeName: app.programme.name,
      submittedAt: app.submittedAt,
      hasAuthLink: Boolean(app.applicant.authUserId),
      enrollmentStatus: enrollment?.status ?? null,
      paidAmount: paid,
      invoiceStatus: app.feeInvoice?.status ?? null,
    });
  }
  return rows;
}

export async function ensureLegacyUserLinked(email: string, authUserId: string) {
  const db = getDb();
  if (!db) return null;
  const normalized = email.trim().toLowerCase();
  const existing = await db.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (!existing) return null;
  if (existing.authUserId === authUserId) return existing;
  try {
    return await db.user.update({
      where: { id: existing.id },
      data: { authUserId, status: "ACTIVE" },
    });
  } catch {
    // Unique constraint on authUserId — another row already holds this Neon id
    return existing;
  }
}

export async function countOperationalGaps() {
  const db = getDb();
  if (!db) {
    return { databaseConfigured: false as const };
  }

  const [
    users,
    applicationsOpen,
    enrollmentsActive,
    invoicesUnpaid,
    programmes,
    roles,
  ] = await Promise.all([
    db.user.count(),
    db.application.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW", "OFFERED"] } },
    }),
    db.enrollment.count({ where: { status: { in: ["ACTIVE", "PENDING"] } } }),
    db.invoice.count({ where: { status: { in: ["ISSUED", "PARTIAL", "OVERDUE"] } } }),
    db.programme.count(),
    db.role.count(),
  ]);

  return {
    databaseConfigured: true as const,
    users,
    applicationsOpen,
    enrollmentsActive,
    invoicesUnpaid,
    programmes,
    roles,
  };
}

/** Staff-only gate for bridge routes. */
export async function requireStaffForBridge() {
  const user = await getCurrentUser();
  if (!user) return null;
  const codes = user.roles.map((r) => r.role.code);
  const allowed = codes.some((c) =>
    ["PRINCIPAL", "ACADEMIC_DIRECTOR", "REGISTRAR", "ADMISSIONS", "FINANCE"].includes(c),
  );
  return allowed ? user : null;
}
