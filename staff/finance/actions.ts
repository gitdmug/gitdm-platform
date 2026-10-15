"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/access";
import { verifyOfflinePayment } from "@/lib/finance-clearance";

export async function verifyOfflinePaymentAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");

  const roleCodes = (user.roles || []).map((r: any) => r.role?.code).filter(Boolean);
  const allowed = roleCodes.some((c: string) =>
    ["PRINCIPAL", "FINANCE", "BURSAR_BILLING_SPECIALIST"].includes(c)
  );
  if (!allowed) throw new Error("Not authorised to verify payments.");

  const invoiceId = String(formData.get("invoiceId") || "");
  const userId = String(formData.get("userId") || "");
  const amount = Number(formData.get("amount") || 0);
  const reference = String(formData.get("reference") || "").trim();
  if (!invoiceId || !userId || !reference || amount <= 0) {
    throw new Error("Invoice, student, amount and reference are required.");
  }

  await verifyOfflinePayment({
    invoiceId,
    userId,
    verifiedById: user.id,
    amount,
    reference,
  });

  revalidatePath("/staff/finance");
  revalidatePath("/student");
  revalidatePath("/student/finance");
  revalidatePath("/applicant");
  redirect("/staff/finance?verified=1");
}
