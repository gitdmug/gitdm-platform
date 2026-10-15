"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/access";
import { getDb } from "@/lib/db";
import { getPublicAppUrl, submitPesapalOrder, settlePesapalPayment } from "@/lib/pesapal";
import { uploadPrivateFile } from "@/lib/file-storage";
import { brandedEmail, notifyAdmissionsTeam, sendEmail } from "@/lib/mail";
import { GITDM } from "@/lib/branding";

export async function uploadApplicationDocument(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");
  const applicationId = String(formData.get("applicationId") || "");
  const type = String(formData.get("type") || "");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please select a document.");
  if (!["IDENTITY", "EDUCATION", "OTHER"].includes(type)) throw new Error("Invalid document type.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Documents must be 10 MB or smaller.");
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (file.type && !allowed.includes(file.type)) throw new Error("Upload PDF, JPG, PNG or WebP documents only.");

  const app = await db.application.findFirst({
    where: { id: applicationId, applicantId: user.id, status: "DRAFT" },
  });
  if (!app) throw new Error("Application is not available for document upload.");

  const fileUrl = await uploadPrivateFile(file, "gitdm/admissions", `${user.id}-${applicationId}-${type}`);
  await db.applicationDocument.create({
    data: {
      applicationId,
      type: type as "IDENTITY" | "EDUCATION" | "OTHER",
      fileUrl,
      originalName: file.name,
    },
  });
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "APPLICATION_DOCUMENT_UPLOADED",
      entity: "Application",
      entityId: applicationId,
      metadataJson: JSON.stringify({ type, originalName: file.name, size: file.size }),
    },
  });
  redirect(`/admissions/apply/${applicationId}`);
}

export async function submitApplication(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");

  const id = String(formData.get("applicationId") || "");
  const app = await db.application.findFirst({
    where: { id, applicantId: user.id, status: "DRAFT" },
    include: { programme: true },
  });
  if (!app) throw new Error("Application not found.");

  const legalName = String(formData.get("legalName") || "").trim();
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const dateOfBirthRaw = String(formData.get("dateOfBirth") || "").trim();
  const nationality = String(formData.get("nationality") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const country = String(formData.get("country") || "Uganda").trim();
  const educationBackground = String(formData.get("educationBackground") || "").trim();
  const motivation = String(formData.get("motivation") || "").trim();
  const howHeard = String(formData.get("howHeard") || "").trim();

  if (!legalName || legalName.length < 3) {
    throw new Error("Enter your full legal name exactly as it appears on your national ID or passport.");
  }
  if (!firstName || !lastName) throw new Error("Enter your first name and last name.");
  if (!phone || phone.length < 9) throw new Error("Enter a valid phone number.");
  if (!nationality) throw new Error("Enter your nationality.");
  if (!educationBackground || educationBackground.length < 10) {
    throw new Error("Describe your education background (at least a short summary).");
  }
  if (!motivation || motivation.length < 20) {
    throw new Error("Tell us why you want to join this programme (at least 20 characters).");
  }

  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  if (dateOfBirthRaw && Number.isNaN(dateOfBirth?.getTime())) {
    throw new Error("Enter a valid date of birth.");
  }

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { firstName, lastName, phone },
    });

    await tx.profile.upsert({
      where: { userId: user.id },
      update: {
        dateOfBirth,
        gender: gender || null,
        nationality,
        address: address || null,
        city: city || null,
        country,
      },
      create: {
        userId: user.id,
        dateOfBirth,
        gender: gender || null,
        nationality,
        address: address || null,
        city: city || null,
        country,
      },
    });

    await tx.application.update({
      where: { id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        legalName,
        phone,
        dateOfBirth,
        nationality,
        gender: gender || null,
        address: address || null,
        city: city || null,
        country,
        educationBackground,
        motivation,
        howHeard: howHeard || null,
      },
    });

    // Learner/member status is derived from the application and eventual enrolment;
    // no STUDENT role is allocated.

    await tx.notification.create({
      data: {
        userId: user.id,
        type: "ADMISSIONS",
        title: "Application received",
        body: `Your application to ${app.programme.name} has been received by Admissions & Registry. You will be notified when a decision is made.`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "APPLICATION_SUBMITTED",
        entity: "Application",
        entityId: id,
        metadataJson: JSON.stringify({ programmeId: app.programmeId, legalName }),
      },
    });
  });

  const ref = id.slice(-8).toUpperCase();
  const portalUrl = `${getPublicAppUrl()}/admissions/apply/${id}`;

  await sendEmail({
    to: user.email,
    userId: user.id,
    event: "APPLICATION_SUBMITTED",
    mailbox: "admissions",
    subject: `Application received — ${app.programme.name} | ${GITDM.shortName}`,
    html: brandedEmail({
      title: "We have received your application",
      preheader: `Your application to ${app.programme.name} is now with Admissions & Registry.`,
      bodyHtml: `
        <p>Dear ${legalName},</p>
        <p>Thank you for applying to the <strong>${app.programme.name}</strong> programme at ${GITDM.name}.</p>
        <p>Your application reference is <strong>${ref}</strong>. It has been sent to our <strong>Admissions & Registry</strong> department for review.</p>
        <p><strong>What happens next</strong></p>
        <ol style="padding-left:18px;line-height:1.6">
          <li>Our team reviews your application details.</li>
          <li>You receive an email when a decision is recorded.</li>
          <li>If accepted, complete the required fee payment to unlock full Campus access.</li>
          <li>If not accepted, you may submit an appeal from your application page.</li>
        </ol>
      `,
      ctaLabel: "View my application",
      ctaHref: portalUrl,
    }),
  });

  await notifyAdmissionsTeam(
    `New application ${ref} — ${app.programme.name}`,
    `
      <p>A new application is ready for review.</p>
      <ul style="line-height:1.7">
        <li><strong>Reference:</strong> ${ref}</li>
        <li><strong>Applicant:</strong> ${legalName}</li>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Phone:</strong> ${phone}</li>
        <li><strong>Programme:</strong> ${app.programme.name}</li>
        <li><strong>Nationality:</strong> ${nationality}</li>
      </ul>
    `,
  );

  revalidatePath(`/admissions/apply/${id}`);
  redirect(`/admissions/apply/${id}?submitted=1`);
}

export async function payApplicationFee(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");
  const applicationId = String(formData.get("applicationId") || "").trim();
  const app = await db.application.findFirst({
    where: { id: applicationId, applicantId: user.id },
    include: { programme: true, feeInvoice: true },
  });
  if (!app?.feeInvoice) throw new Error("No application fee invoice found.");
  if (Number(app.feeInvoice.amountPaid) >= Number(app.feeInvoice.amount)) {
    redirect(`/admissions/apply/${applicationId}?payment=already-paid`);
  }

  const amountDue = Number(app.feeInvoice.amount) - Number(app.feeInvoice.amountPaid);
  const description = `Application fee — ${app.programme.name}`.slice(0, 100);
  const merchantReference = `GITDM-APP-${applicationId.slice(-8)}-${Date.now()}`.slice(0, 50);
  const appUrl = getPublicAppUrl();

  const payment = await db.payment.create({
    data: {
      userId: user.id,
      invoiceId: app.feeInvoice.id,
      amount: amountDue,
      currency: app.feeInvoice.currency,
      status: "PENDING",
      provider: "PESAPAL",
      providerMerchantRef: merchantReference,
      providerDescription: description,
    },
  });

  try {
    const response = await submitPesapalOrder({
      merchantReference,
      amount: amountDue,
      currency: app.feeInvoice.currency,
      description,
      callbackUrl: `${appUrl}/api/payments/pesapal/callback`,
      cancellationUrl: `${appUrl}/admissions/apply/${applicationId}?payment=cancelled`,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    });
    if (!response.redirect_url || !response.order_tracking_id) {
      throw new Error(response.message || "Pesapal did not return a checkout URL.");
    }
    await db.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: response.order_tracking_id,
        providerMerchantRef: response.merchant_reference || merchantReference,
        providerRedirectUrl: response.redirect_url,
        providerResponseJson: JSON.stringify(response),
      },
    });
    redirect(response.redirect_url);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const message = error instanceof Error ? error.message : "Application fee payment could not be started.";
    await db.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", providerDescription: message },
    });
    revalidatePath(`/admissions/apply/${applicationId}`);
    redirect(`/admissions/apply/${applicationId}?payment=failed&error=${encodeURIComponent(message)}`);
  }
}

export async function refreshApplicationFeePayment(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");
  const applicationId = String(formData.get("applicationId") || "");
  const paymentId = String(formData.get("paymentId") || "");
  const payment = await db.payment.findFirst({
    where: { id: paymentId, userId: user.id, provider: "PESAPAL" },
    include: { invoice: true },
  });
  if (!payment || payment.invoice.applicationId !== applicationId || !payment.providerRef) {
    throw new Error("Payment transaction not found.");
  }
  const result = await settlePesapalPayment(payment.providerRef);
  revalidatePath(`/admissions/apply/${applicationId}`);
  redirect(`/admissions/apply/${applicationId}?payment=${String(result.status || "pending").toLowerCase()}`);
}

export async function submitAdmissionsConsultation(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");
  const applicationId = String(formData.get("applicationId") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!subject || subject.length < 3) throw new Error("Enter a consultation subject.");
  if (!message || message.length < 10) throw new Error("Enter a meaningful consultation message.");

  const app = await db.application.findFirst({
    where: { id: applicationId, applicantId: user.id },
    include: { programme: true },
  });
  if (!app) throw new Error("Application not found.");

  const safe = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const ref = applicationId.slice(-8).toUpperCase();
  await notifyAdmissionsTeam(
    `Student consultation ${ref} — ${subject}`,
    `<p>A student has requested an Admissions consultation regarding application <strong>${safe(ref)}</strong>.</p>
     <ul style="line-height:1.7">
       <li><strong>Applicant:</strong> ${safe(app.legalName || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email)}</li>
       <li><strong>Email:</strong> ${safe(user.email)}</li>
       <li><strong>Programme:</strong> ${safe(app.programme.name)}</li>
       <li><strong>Subject:</strong> ${safe(subject)}</li>
     </ul>
     <p><strong>Message:</strong></p><div style="white-space:pre-wrap;line-height:1.7">${safe(message)}</div>
     <p><strong>Application portal:</strong> <a href="${getPublicAppUrl()}/admissions/apply/${applicationId}">${getPublicAppUrl()}/admissions/apply/${applicationId}</a></p>`,
  );

  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "ADMISSIONS_CONSULTATION_REQUESTED",
      entity: "Application",
      entityId: applicationId,
      metadataJson: JSON.stringify({ subject, recipient: GITDM.admissionsEmail }),
    },
  });
  await db.notification.create({
    data: {
      userId: user.id,
      type: "ADMISSIONS",
      title: "Admissions consultation sent",
      body: `Your consultation request for application ${ref} has been sent to Admissions. They can follow up using your application record.`,
    },
  });
  revalidatePath(`/admissions/apply/${applicationId}`);
}

export async function submitAdmissionAppeal(formData: FormData) {
  const user = await getCurrentUser();
  const db = getDb();
  if (!user || !db) redirect("/auth/sign-in");
  const applicationId = String(formData.get("applicationId") || "");
  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 20) throw new Error("Please provide at least 20 characters explaining your appeal.");
  const app = await db.application.findFirst({
    where: { id: applicationId, applicantId: user.id, status: "REJECTED" },
    include: { programme: true },
  });
  if (!app) throw new Error("Only a rejected application can be appealed.");
  if (app.appealStatus === "PENDING") throw new Error("Your appeal is already under review.");

  await db.application.update({
    where: { id: applicationId },
    data: { appealStatus: "PENDING", appealReason: reason, appealedAt: new Date() },
  });

  const admissionsUsers = await db.user.findMany({
    where: { roles: { some: { role: { code: { in: ["ADMISSIONS", "REGISTRAR"] } } } } },
    select: { id: true },
  });

  await db.$transaction([
    db.notification.create({
      data: {
        userId: user.id,
        type: "ADMISSIONS",
        title: "Appeal received",
        body: "Your admission appeal has been received and sent to Admissions & Registry for review.",
      },
    }),
    ...admissionsUsers.map((u) =>
      db.notification.create({
        data: {
          userId: u.id,
          type: "ADMISSIONS",
          title: "Admission appeal submitted",
          body: `A rejected application has received an appeal (${applicationId.slice(-8).toUpperCase()}).`,
        },
      }),
    ),
    db.auditLog.create({
      data: {
        userId: user.id,
        action: "APPLICATION_APPEAL_SUBMITTED",
        entity: "Application",
        entityId: applicationId,
      },
    }),
  ]);

  const ref = applicationId.slice(-8).toUpperCase();
  await sendEmail({
    to: user.email,
    userId: user.id,
    event: "APPLICATION_APPEAL_SUBMITTED",
    mailbox: "admissions",
    subject: `Appeal received — ${app.programme.name} | ${GITDM.shortName}`,
    html: brandedEmail({
      title: "Your appeal has been received",
      bodyHtml: `
        <p>Dear ${app.legalName || user.firstName || "Applicant"},</p>
        <p>We have received your appeal for application <strong>${ref}</strong> (${app.programme.name}).</p>
        <p>Admissions & Registry will review your submission and contact you with the outcome.</p>
      `,
      ctaLabel: "View application",
      ctaHref: `${getPublicAppUrl()}/admissions/apply/${applicationId}`,
    }),
  });

  await notifyAdmissionsTeam(
    `Appeal ${ref} — ${app.programme.name}`,
    `<p>Applicant <strong>${app.legalName || user.email}</strong> submitted an appeal.</p>
     <p><strong>Reason:</strong></p><p>${reason.replace(/</g, "&lt;")}</p>`,
  );

  revalidatePath(`/admissions/apply/${applicationId}`);
  redirect(`/admissions/apply/${applicationId}?appeal=submitted`);
}
