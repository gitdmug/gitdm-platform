/**
 * Principal / leadership oversight metrics.
 * Read-only aggregations from live institutional records.
 */

import { getDb } from "@/lib/db";

export async function getInstitutionSnapshot() {
  const db = getDb();
  if (!db) {
    return {
      applications: {},
      enrollments: {},
      finance: { outstanding: 0, collected: 0 },
      programmes: 0,
      openTickets: 0,
      certificatesIssued: 0,
    };
  }

  const [
    appGroups,
    enrGroups,
    invoices,
    programmes,
    openTickets,
    certificatesIssued,
  ] = await Promise.all([
    db.application.groupBy({ by: ["status"], _count: true }),
    db.enrollment.groupBy({ by: ["status"], _count: true }),
    db.invoice.findMany({
      where: { status: { not: "VOID" }, kind: { in: ["TUITION", "APPLICATION_FEE", "OTHER"] } },
      select: { amount: true, amountPaid: true, status: true, waived: true },
    }),
    db.programme.count({ where: { status: "PUBLISHED" } }),
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] } },
    }),
    db.certificate.count({ where: { status: "ISSUED" } }),
  ]);

  const applications = Object.fromEntries(appGroups.map((g) => [g.status, g._count]));
  const enrollments = Object.fromEntries(enrGroups.map((g) => [g.status, g._count]));

  let outstanding = 0;
  let collected = 0;
  for (const inv of invoices) {
    collected += Number(inv.amountPaid || 0);
    if (!inv.waived && inv.status !== "PAID") {
      outstanding += Math.max(0, Number(inv.amount) - Number(inv.amountPaid));
    }
  }

  return {
    applications,
    enrollments,
    finance: { outstanding, collected },
    programmes,
    openTickets,
    certificatesIssued,
  };
}

export async function getRecentAudit(limit = 25) {
  const db = getDb();
  if (!db) return [];
  return db.auditLog.findMany({
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
