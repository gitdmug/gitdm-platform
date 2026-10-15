import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

const SANDBOX_BASE = "https://cybqa.pesapal.com/pesapalv3";
const LIVE_BASE = "https://pay.pesapal.com/v3";

type PesapalToken = { token?: string; expiryDate?: string; status?: string; message?: string; error?: unknown };
export type PesapalStatusResponse = {
  payment_method?: string;
  amount?: number;
  created_date?: string;
  confirmation_code?: string;
  payment_status_description?: string;
  description?: string;
  message?: string;
  payment_account?: string;
  call_back_url?: string;
  status_code?: number;
  merchant_reference?: string;
  currency?: string;
  status?: string;
  error?: unknown;
};

type PesapalSubmitResponse = {
  order_tracking_id?: string;
  merchant_reference?: string;
  redirect_url?: string;
  status?: string;
  error?: unknown;
  message?: string;
};

function baseUrl() {
  // Keep environment and endpoint aligned. PESAPAL_ENV is authoritative so a
  // stale PESAPAL_BASE cannot accidentally send Sandbox credentials to Live
  // (or Live credentials to Sandbox).
  const env = String(process.env.PESAPAL_ENV || "SANDBOX").trim().toUpperCase();
  const expected = ["LIVE", "PRODUCTION", "PROD"].includes(env) ? LIVE_BASE : SANDBOX_BASE;
  const configured = process.env.PESAPAL_BASE?.trim().replace(/\/$/, "");
  if (configured && configured !== expected) {
    console.warn(`[Pesapal] PESAPAL_BASE does not match PESAPAL_ENV; using ${expected}.`);
  }
  return expected;
}

function credentials() {
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY?.trim();
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET?.trim();
  const ipnId = process.env.PESAPAL_IPN_ID?.trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Pesapal credentials are not configured.");
  }
  if (!ipnId) throw new Error("PESAPAL_IPN_ID is not configured.");
  return { consumerKey, consumerSecret, ipnId };
}

export function pesapalIpnUrl() {
  return (
    process.env.IPN_LISTENER_URL?.trim() ||
    `${getPublicAppUrl()}/api/pesapal/ipn`
  );
}

export function getPublicAppUrl() {
  const configured =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "https://globalinstituteoftrading.com";

  return /^https?:\/\//i.test(configured)
    ? configured.replace(/\/$/, "")
    : `https://${configured.replace(/\/$/, "")}`;
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const text = await response.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!response.ok) {
    const detail = body?.error?.message || body?.message || `Pesapal request failed (${response.status}).`;
    throw new Error(detail);
  }
  if (body?.error?.message) throw new Error(body.error.message);
  return body as T;
}

export async function getPesapalToken(): Promise<PesapalToken & { token: string }> {
  const { consumerKey, consumerSecret } = credentials();
  const response = await requestJson<PesapalToken>(`${baseUrl()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
  });

  if (!response.token || typeof response.token !== "string" || response.token.trim().length < 20) {
    const message = response.message || (response.error && typeof response.error === "object" && "message" in response.error ? String((response.error as {message?: unknown}).message) : "Pesapal did not return a valid access token.");
    throw new Error(`Pesapal authentication failed: ${message}`);
  }

  return { ...response, token: response.token.trim() };
}

export async function submitPesapalOrder(input: {
  merchantReference: string;
  amount: number;
  currency: string;
  description: string;
  callbackUrl: string;
  cancellationUrl: string;
  email: string;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  const { ipnId } = credentials();
  const submit = async (token: string) => requestJson<PesapalSubmitResponse>(
    `${baseUrl()}/api/Transactions/SubmitOrderRequest`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: input.merchantReference,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        description: input.description.slice(0, 100),
        callback_url: input.callbackUrl,
        cancellation_url: input.cancellationUrl,
        notification_id: ipnId,
        redirect_mode: "TOP_WINDOW",
        billing_address: {
          email_address: input.email,
          phone_number: input.phone || "",
          country_code: "UG",
          first_name: input.firstName || "Student",
          middle_name: "",
          last_name: input.lastName || "",
          line_1: "GITDM",
          line_2: "",
          city: "Kampala",
          state: "Central",
          postal_code: "",
          zip_code: "",
        },
      }),
    },
  );

  try {
    const { token } = await getPesapalToken();
    return await submit(token);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // A short-lived token can expire between authentication and submission.
    // Retry exactly once with a newly issued token; do not loop indefinitely.
    if (/invalid access token|access token/i.test(message)) {
      const { token } = await getPesapalToken();
      return await submit(token);
    }
    throw error;
  }
}

export async function getPesapalTransactionStatus(orderTrackingId: string) {
  const { token } = await getPesapalToken();
  return requestJson<PesapalStatusResponse>(
    `${baseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

function parseProviderDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusFromPesapal(result: PesapalStatusResponse): "COMPLETED" | "FAILED" | "PENDING" {
  const code = Number(result.status_code);
  if (code === 1 || String(result.payment_status_description || "").toUpperCase() === "COMPLETED") {
    return "COMPLETED";
  }
  if (
    code === 2 ||
    code === 3 ||
    ["FAILED", "INVALID", "REVERSED", "CANCELLED"].includes(
      String(result.payment_status_description || "").toUpperCase(),
    )
  ) {
    return "FAILED";
  }
  return "PENDING";
}

/**
 * Fetches the authoritative transaction status from Pesapal and applies it
 * to the matching local payment. This is deliberately idempotent because both
 * the browser callback and Pesapal IPN can arrive for the same transaction.
 */
export async function settlePesapalPayment(orderTrackingId: string) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable.");
  const trackingId = orderTrackingId.trim();
  if (!trackingId) throw new Error("Missing Pesapal order tracking ID.");

  const payment = await db.payment.findFirst({
    where: { provider: "PESAPAL", providerRef: trackingId },
    include: {
      invoice: {
        include: {
          enrollment: {
            include: { programme: { include: { rules: true } } },
          },
        },
      },
    },
  });

  if (!payment) return { found: false as const, status: "UNKNOWN" as const };

  const result = await getPesapalTransactionStatus(trackingId);
  const localAmount = Number(payment.amount);
  const providerAmount =
    result.amount === undefined || result.amount === null ? null : Number(result.amount);
  const localCurrency = payment.currency.toUpperCase();
  const providerCurrency = String(result.currency || "").toUpperCase();
  const merchantReference = String(result.merchant_reference || "");

  // Never grant financial credit unless Pesapal's response matches the local
  // order we created. Amount/currency/reference are server-side checks.
  const amountMatches =
    providerAmount !== null && Math.abs(providerAmount - localAmount) < 0.01;
  const currencyMatches = providerCurrency === localCurrency;
  const referenceMatches =
    Boolean(payment.providerMerchantRef) && Boolean(merchantReference) && merchantReference === payment.providerMerchantRef;

  const providerStatus = String(
    result.payment_status_description || result.status || "",
  ).toUpperCase();
  const resolvedStatus = statusFromPesapal(result);

  await db.payment.update({
    where: { id: payment.id },
    data: {
      providerStatus,
      providerMethod: result.payment_method || null,
      providerConfirmationCode: result.confirmation_code || null,
      providerAccount: result.payment_account || null,
      providerDescription: result.description || result.message || null,
      providerCreatedAt: parseProviderDate(result.created_date),
      providerResponseJson: JSON.stringify(result),
    },
  });

  if (!amountMatches || !currencyMatches || !referenceMatches) {
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    await db.auditLog.create({
      data: {
        userId: payment.userId,
        action: "PESAPAL_PAYMENT_VALIDATION_FAILED",
        entity: "Payment",
        entityId: payment.id,
        severity: "CRITICAL",
        metadataJson: JSON.stringify({
          orderTrackingId: trackingId,
          expected: {
            amount: localAmount,
            currency: localCurrency,
            merchantReference: payment.providerMerchantRef,
          },
          received: {
            amount: providerAmount,
            currency: providerCurrency,
            merchantReference,
          },
        }),
      },
    });
    return { found: true as const, status: "FAILED" as const, paymentId: payment.id };
  }

  if (resolvedStatus === "COMPLETED") {
    const settled = await db.$transaction(async (tx) => {
      // Atomic state transition makes duplicate callback + IPN delivery safe.
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "COMPLETED", verifiedAt: new Date() },
      });
      if (claimed.count === 0) {
        const current = await tx.payment.findUnique({ where: { id: payment.id } });
        return { alreadySettled: current?.status === "COMPLETED" };
      }

      const current = await tx.payment.findUnique({
        where: { id: payment.id },
        include: {
          invoice: {
            include: {
              enrollment: {
                include: { programme: { include: { rules: true } } },
              },
            },
          },
        },
      });
      if (!current) throw new Error("Payment disappeared during settlement.");

      const newPaid = Number(current.invoice.amountPaid) + Number(current.amount);
      const invoiceStatus =
        newPaid >= Number(current.invoice.amount) ? "PAID" : "PARTIALLY_PAID";

      const invoiceUpdate = await tx.invoice.updateMany({
        where: { id: current.invoiceId, amountPaid: current.invoice.amountPaid, status: current.invoice.status },
        data: { amountPaid: newPaid, status: invoiceStatus },
      });
      if (invoiceUpdate.count !== 1) throw new Error("Invoice balance changed during payment settlement. Retry the status check.");

      let access: "FULL" | "LIMITED" = "LIMITED";
      const enrollment = current.invoice.enrollment;
      if (current.invoice.kind !== "APPLICATION_FEE" && enrollment && current.invoice.enrollmentId) {
        const enrollmentId = current.invoice.enrollmentId;
        const totals = await tx.invoice.aggregate({
          where: {
            enrollmentId,
            periodId: current.invoice.periodId || null,
            kind: "TUITION",
            status: { notIn: ["DRAFT", "VOID"] },
          },
          _sum: { amount: true, amountPaid: true },
        });
        const total = Number(totals._sum.amount || 0);
        const paid = Number(totals._sum.amountPaid || 0);
        const threshold = Number(
          enrollment.programme?.rules?.activationPaymentPercent || 60,
        );
        access = total > 0 && (paid / total) * 100 >= threshold ? "FULL" : "LIMITED";

        const wasFullyActivated = enrollment.accessLevel === "FULL";
        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: {
            accessLevel: access,
            activatedAt:
              access === "FULL"
                ? enrollment.activatedAt || new Date()
                : enrollment.activatedAt,
          },
        });

        if (access === "FULL" && !wasFullyActivated) {
          const application = await tx.application.findFirst({
            where: {
              applicantId: current.userId,
              programmeId: enrollment.programmeId,
              status: { in: ["ACCEPTED", "ADMITTED"] },
            },
            orderBy: { submittedAt: "desc" },
            select: { id: true, programmeId: true },
          });
          if (application) {
            await tx.notification.create({
              data: {
                userId: current.userId,
                type: "ADMISSIONS",
                title: "Admissions complete — payment cleared",
                body: "Your admission and required payment clearance are complete. Admissions has closed its stage. Continue in Campus for your next onboarding and academic steps.",
              },
            });
            await tx.auditLog.create({
              data: {
                userId: current.userId,
                action: "ADMISSIONS_PAYMENT_CLEARANCE_COMPLETED",
                entity: "Application",
                entityId: application.id,
                metadataJson: JSON.stringify({ enrollmentId: current.invoice.enrollmentId, paymentId: current.id, accessLevel: "FULL" }),
              },
            });
          }
        }
      }

      const existingReceipt = await tx.receipt.findUnique({
        where: { paymentId: current.id },
      });
      const receipt =
        existingReceipt ||
        (await tx.receipt.create({
          data: {
            paymentId: current.id,
            invoiceId: current.invoiceId,
            userId: current.userId,
            receiptNo: `RCT-${new Date().getFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
          },
        }));

      const isApplicationFee = current.invoice.kind === "APPLICATION_FEE";
      await tx.notification.create({
        data: {
          userId: current.userId,
          type: isApplicationFee ? "ADMISSIONS" : "FINANCE",
          title: isApplicationFee ? "Application fee confirmed" : "Pesapal payment confirmed",
          body: isApplicationFee
            ? `Your GITDM application fee of ${current.currency} ${Number(current.amount).toLocaleString()} has been confirmed. Receipt ${receipt.receiptNo}. Admissions can now review your application.`
            : `Your payment of ${current.currency} ${Number(current.amount).toLocaleString()} has been confirmed. Your account is now ${access === "FULL" ? "fully activated" : "partially cleared"}. Receipt ${receipt.receiptNo}.`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: current.userId,
          action: "PESAPAL_PAYMENT_CONFIRMED",
          entity: "Payment",
          entityId: current.id,
          metadataJson: JSON.stringify({
            orderTrackingId: trackingId,
            merchantReference: current.providerMerchantRef,
            amount: Number(current.amount),
            currency: current.currency,
            confirmationCode: result.confirmation_code || null,
            paymentMethod: result.payment_method || null,
            receiptNo: receipt.receiptNo,
          }),
        },
      });

      return { alreadySettled: false };
    });

    return {
      found: true as const,
      status: "COMPLETED" as const,
      paymentId: payment.id,
      applicationId: payment.invoice?.applicationId || null,
      alreadySettled: settled.alreadySettled,
    };
  }

  if (resolvedStatus === "FAILED") {
    await db.payment.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return { found: true as const, status: "FAILED" as const, paymentId: payment.id };
  }

  return { found: true as const, status: "PENDING" as const, paymentId: payment.id };
}
