/** Consistent human-readable labels for institutional statuses. */

export function humanStatus(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function money(value: unknown, currency = "UGX"): string {
  const n = Number(value || 0);
  return `${currency} ${n.toLocaleString("en-UG")}`;
}

/** Application lifecycle (blueprint-aligned). */
export const APPLICATION_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  FEE_PENDING: "Application fee pending",
  UNDER_REVIEW: "Under review",
  INTERVIEW_SCHEDULED: "Interview scheduled",
  INTERVIEW_REQUIRED: "Interview required",
  ADDITIONAL_INFORMATION: "Additional information required",
  ADMITTED: "Admitted",
  ACCEPTED: "Admitted",
  REJECTED: "Rejected",
  DEFERRED: "Deferred",
  APPEAL_PENDING: "Appeal pending",
  WITHDRAWN: "Withdrawn",
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Cancelled",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending enrolment",
  ACTIVE: "Enrolled",
  COMPLETED: "Completed",
  SUSPENDED: "Suspended",
  WITHDRAWN: "Withdrawn",
  REPEATING: "Repeating",
};

export function applicationStatusLabel(status: string): string {
  return APPLICATION_STATUS_LABEL[status] || humanStatus(status);
}

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABEL[status] || humanStatus(status);
}

export function enrollmentStatusLabel(status: string): string {
  return ENROLLMENT_STATUS_LABEL[status] || humanStatus(status);
}
