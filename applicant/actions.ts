"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/access";
import { initiateInvoicePayment } from "@/lib/payments-initiate";

export async function payApplicationFeeOnline(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in?returnTo=/applicant");

  const invoiceId = String(formData.get("invoiceId") || "");
  if (!invoiceId) throw new Error("Missing invoice.");

  try {
    const { redirectUrl } = await initiateInvoicePayment({
      invoiceId,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    redirect(redirectUrl);
  } catch (err: any) {
    redirect(
      `/applicant?error=${encodeURIComponent(err?.message || "Payment could not start")}`
    );
  }
}
