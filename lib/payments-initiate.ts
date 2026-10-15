/**
 * Start an online Pesapal payment for an invoice owned by the current user.
 * Falls back gracefully when Pesapal is misconfigured or hits account limits.
 */

import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";
import {
  submitPesapalOrder,
  getPublicAppUrl,
  settlePesapalPayment,
} from "@/lib/pesapal";
import { advanceAfterFeePayment } from "@/lib/admissions-workflow";
import { reevaluateAccess } from "@/lib/finance-clearance";

export async function initiateInvoicePayment(params: {
  invoiceId: string;
  userId: string;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const invoice = await db.invoice.findFirst({
    where: {
      id: params.invoiceId,
      OR: [
        { enrollment: { userId: params.userId } },
        { application: { applicantId: params.userId } },
      ],
    },
  });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.waived || invoice.status === "PAID") {
    throw new Error("This invoice is already settled.");
  }

  const outstanding = Number(invoice.amount) - Number(invoice.amountPaid);
  if (outstanding <= 0) throw new Error("Nothing outstanding on this invoice.");

  const merchantReference = `GITDM-${invoice.invoiceNo}-${randomUUID().slice(0, 8)}`.slice(0, 50);
  const appUrl = getPublicAppUrl();
  const callbackUrl = `${appUrl}/api/pesapal/callback`;
  const cancellationUrl = `${appUrl}/student/finance?cancelled=1`;

  let order;
  try {
    order = await submitPesapalOrder({
      merchantReference,
      amount: outstanding,
      currency: invoice.currency || "UGX",
      description: invoice.description.slice(0, 100),
      callbackUrl,
      cancellationUrl,
      email: params.email,
      phone: params.phone,
      firstName: params.firstName,
      lastName: params.lastName,
    });
  } catch (err: any) {
    const message = String(err?.message || err);
    // Surface actionable fallback when Pesapal rejects (e.g. transaction limit)
    throw new Error(
      `Online payment unavailable: ${message}. Please use bank transfer or mobile money with invoice ${invoice.invoiceNo} as reference, then Finance will verify.`
    );
  }

  if (!order.order_tracking_id || !order.redirect_url) {
    throw new Error(
      "Pesapal did not return a payment link. Please try again or use the offline payment option."
    );
  }

  await db.payment.create({
    data: {
      invoiceId: invoice.id,
      userId: params.userId,
      provider: "PESAPAL",
      providerRef: order.order_tracking_id,
      providerMerchantRef: merchantReference,
      providerStatus: "PENDING",
      providerRedirectUrl: order.redirect_url,
      amount: outstanding,
      currency: invoice.currency || "UGX",
      status: "PENDING",
    },
  });

  return {
    redirectUrl: order.redirect_url,
    trackingId: order.order_tracking_id,
    merchantReference,
  };
}

/** After browser callback or IPN — settle and advance workflows. */
export async function completePesapalFlow(orderTrackingId: string) {
  const result = await settlePesapalPayment(orderTrackingId);

  if (result.found && result.status === "COMPLETED" && !result.alreadySettled) {
    const db = getDb();
    if (db && result.paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: result.paymentId },
        include: { invoice: true },
      });
      if (payment?.invoice) {
        if (payment.invoice.kind === "APPLICATION_FEE" && payment.invoice.applicationId) {
          await advanceAfterFeePayment(payment.invoice.applicationId);
        }
        if (payment.invoice.enrollmentId) {
          await reevaluateAccess(payment.invoice.enrollmentId);
        }
      }
    }
  }

  return result;
}
