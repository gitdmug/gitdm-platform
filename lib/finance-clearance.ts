/**
 * Financial clearance & learning-access engine.
 *
 * Rules are read from ProgrammeRule (configurable per programme):
 * - activationPaymentPercent (default 60%) → learning access eligible
 * - examPaymentClearancePercent (default 100%) → eligible for final exams
 *
 * A payment is only considered settled when:
 * - provider callback confirms it, OR
 * - Finance staff verifies an offline payment, OR
 * - an authorised waiver is recorded.
 * Student-uploaded screenshots never auto-settle an invoice.
 */

import { getDb } from "@/lib/db";
import { DEFAULT_ACADEMIC_RULES } from "@/lib/academic-rules";
import { advanceAfterFeePayment } from "@/lib/admissions-workflow";

export type ClearanceStatus =
  | "AWAITING_INVOICE"
  | "PAYMENT_PENDING"
  | "PARTIALLY_PAID"
  | "LEARNING_ACCESS_ELIGIBLE"
  | "BALANCE_DUE_BEFORE_EXAM"
  | "FINANCIALLY_CLEARED"
  | "OVERDUE"
  | "PAYMENT_UNDER_REVIEW"
  | "APPROVED_EXCEPTION";

export type ClearanceSnapshot = {
  enrollmentId: string;
  programmeId: string;
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  activationPercentRequired: number;
  examPercentRequired: number;
  percentPaid: number;
  learningAccessEligible: boolean;
  examEligible: boolean;
  financiallyCleared: boolean;
  status: ClearanceStatus;
  accessLevel: "LIMITED" | "FULL" | "RESTRICTED";
  overrideActive: boolean;
};

function num(v: unknown): number {
  return Number(v || 0);
}

export async function computeClearance(enrollmentId: string): Promise<ClearanceSnapshot | null> {
  const db = getDb();
  if (!db) return null;

  const enrollment = await db.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      programme: { include: { rules: true } },
      invoices: {
        where: { status: { not: "VOID" }, kind: { in: ["TUITION", "OTHER"] } },
      },
    },
  });
  if (!enrollment) return null;

  const rules = enrollment.programme.rules;
  const activationPercent = num(rules?.activationPaymentPercent ?? DEFAULT_ACADEMIC_RULES.activationPaymentPercent);
  const examPercent = num(rules?.examPaymentClearancePercent ?? DEFAULT_ACADEMIC_RULES.examPaymentClearancePercent);

  const invoices = enrollment.invoices || [];
  const totalInvoiced = invoices.reduce((s, i) => s + num(i.amount), 0);
  const totalPaid = invoices.reduce((s, i) => {
    if (i.waived) return s + num(i.amount);
    return s + num(i.amountPaid);
  }, 0);
  const totalOutstanding = Math.max(0, totalInvoiced - totalPaid);
  const percentPaid = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

  const overrideActive = Boolean(enrollment.financialClearanceOverride);
  const learningAccessEligible = overrideActive || percentPaid >= activationPercent || totalInvoiced === 0;
  const examEligible = overrideActive || percentPaid >= examPercent || totalInvoiced === 0;
  const financiallyCleared = overrideActive || (totalOutstanding <= 0 && totalInvoiced > 0) || totalInvoiced === 0;

  let status: ClearanceStatus;
  if (enrollment.financialClearanceOverride) {
    status = "APPROVED_EXCEPTION";
  } else if (totalInvoiced === 0) {
    status = "AWAITING_INVOICE";
  } else if (financiallyCleared) {
    status = "FINANCIALLY_CLEARED";
  } else if (learningAccessEligible && !examEligible) {
    status = "BALANCE_DUE_BEFORE_EXAM";
  } else if (learningAccessEligible) {
    status = "LEARNING_ACCESS_ELIGIBLE";
  } else if (totalPaid > 0) {
    status = "PARTIALLY_PAID";
  } else {
    const overdue = invoices.some((i) => i.status === "OVERDUE" || (i.dueAt && i.dueAt < new Date() && i.status !== "PAID"));
    status = overdue ? "OVERDUE" : "PAYMENT_PENDING";
  }

  let accessLevel: "LIMITED" | "FULL" | "RESTRICTED" = "LIMITED";
  if (enrollment.status === "SUSPENDED") {
    accessLevel = "RESTRICTED";
  } else if (learningAccessEligible) {
    accessLevel = "FULL";
  } else {
    accessLevel = "LIMITED";
  }

  return {
    enrollmentId,
    programmeId: enrollment.programmeId,
    currency: enrollment.programme.currency || "UGX",
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    activationPercentRequired: activationPercent,
    examPercentRequired: examPercent,
    percentPaid: Math.round(percentPaid * 100) / 100,
    learningAccessEligible,
    examEligible,
    financiallyCleared,
    status,
    accessLevel,
    overrideActive,
  };
}

/**
 * Re-evaluate clearance and update Enrollment.accessLevel.
 * Call after any verified payment, waiver, or finance override.
 */
export async function reevaluateAccess(enrollmentId: string): Promise<ClearanceSnapshot | null> {
  const snapshot = await computeClearance(enrollmentId);
  if (!snapshot) return null;

  const db = getDb();
  if (!db) return snapshot;

  await db.enrollment.update({
    where: { id: enrollmentId },
    data: { accessLevel: snapshot.accessLevel },
  });

  return snapshot;
}

/**
 * Allocate a verified payment to an invoice, issue receipt, update balances,
 * and re-run the access engine. Never call this for unverified student evidence.
 */
export async function settlePayment(params: {
  invoiceId: string;
  userId: string;
  amount: number;
  provider: string;
  providerRef?: string;
  providerStatus?: string;
  providerMethod?: string;
  providerConfirmationCode?: string;
  verifiedByStaff?: boolean;
  evidenceUrl?: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  return db.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: params.invoiceId },
      include: { application: true },
    });

    const amount = Math.min(params.amount, num(invoice.amount) - num(invoice.amountPaid));
    if (amount <= 0 && !invoice.waived) {
      throw new Error("Invoice is already fully paid.");
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        userId: params.userId,
        provider: params.provider,
        providerRef: params.providerRef || null,
        providerStatus: params.providerStatus || "COMPLETED",
        providerMethod: params.providerMethod || null,
        providerConfirmationCode: params.providerConfirmationCode || null,
        amount,
        currency: invoice.currency,
        status: "COMPLETED",
        verifiedAt: new Date(),
        evidenceUrl: params.evidenceUrl || null,
      },
    });

    const newPaid = num(invoice.amountPaid) + amount;
    const fullyPaid = newPaid >= num(invoice.amount) || invoice.waived;
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newPaid,
        status: fullyPaid ? "PAID" : "PARTIALLY_PAID",
      },
    });

    const receiptNo = `GITDM-RCPT-${new Date().getFullYear()}-${payment.id.slice(-8).toUpperCase()}`;
    await tx.receipt.create({
      data: {
        paymentId: payment.id,
        invoiceId: invoice.id,
        userId: params.userId,
        receiptNo,
      },
    });

    // Application fee → advance admissions workflow
    if (invoice.kind === "APPLICATION_FEE" && invoice.applicationId && fullyPaid) {
      await advanceAfterFeePayment(invoice.applicationId);
    }

    return { paymentId: payment.id, receiptNo, enrollmentId: invoice.enrollmentId };
  }).then(async (result) => {
    if (result.enrollmentId) {
      await reevaluateAccess(result.enrollmentId);
    }
    return result;
  });
}

/**
 * Record an authorised offline / bank payment after Finance verification.
 */
export async function verifyOfflinePayment(params: {
  invoiceId: string;
  userId: string; // student
  verifiedById: string; // staff
  amount: number;
  reference: string;
  evidenceUrl?: string;
  note?: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const result = await settlePayment({
    invoiceId: params.invoiceId,
    userId: params.userId,
    amount: params.amount,
    provider: "OFFLINE",
    providerRef: params.reference,
    providerStatus: "VERIFIED",
    providerMethod: "BANK_OR_MOBILE_MONEY",
    verifiedByStaff: true,
    evidenceUrl: params.evidenceUrl,
  });

  await db.auditLog.create({
    data: {
      userId: params.verifiedById,
      action: "PAYMENT_VERIFIED_OFFLINE",
      entity: "Invoice",
      entityId: params.invoiceId,
      metadataJson: JSON.stringify({
        reference: params.reference,
        amount: params.amount,
        note: params.note || null,
        paymentId: result.paymentId,
      }),
    },
  });

  return result;
}

export function clearanceStatusLabel(status: ClearanceStatus): string {
  const map: Record<ClearanceStatus, string> = {
    AWAITING_INVOICE: "Awaiting invoice",
    PAYMENT_PENDING: "Payment pending",
    PARTIALLY_PAID: "Partially paid",
    LEARNING_ACCESS_ELIGIBLE: "Learning access eligible",
    BALANCE_DUE_BEFORE_EXAM: "Balance due before examination",
    FINANCIALLY_CLEARED: "Financially cleared",
    OVERDUE: "Overdue / access restricted",
    PAYMENT_UNDER_REVIEW: "Payment under review",
    APPROVED_EXCEPTION: "Approved exception",
  };
  return map[status] || status;
}
