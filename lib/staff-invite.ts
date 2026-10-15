import { getDb } from "@/lib/db";
import { notifyUser } from "@/lib/notify";
import { sendEmail, brandedEmail } from "@/lib/mail";
import { getPublicAppUrl } from "@/lib/pesapal";

export async function createStaffInvitation(params: {
  email: string;
  roleCode: string;
  departmentId: string;
  invitedById: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const email = params.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Valid email required.");

  // Ensure department exists
  const dept = await db.department.findUnique({ where: { id: params.departmentId } });
  if (!dept) throw new Error("Department not found.");

  const invitation = await db.staffInvitation.create({
    data: {
      email,
      roleCode: params.roleCode as any,
      departmentId: params.departmentId,
      invitedById: params.invitedById,
      status: "PENDING",
    },
  });

  await db.auditLog.create({
    data: {
      userId: params.invitedById,
      action: "STAFF_INVITED",
      entity: "StaffInvitation",
      entityId: invitation.id,
      metadataJson: JSON.stringify({ email, roleCode: params.roleCode }),
    },
  });

  const appUrl = getPublicAppUrl();
  try {
    await sendEmail({
      to: email,
      subject: "You're invited to GITDM staff",
      html: brandedEmail({
        title: "Staff invitation",
        bodyHtml: `<p>You have been invited to join the GITDM staff team as <strong>${params.roleCode.replaceAll("_", " ")}</strong> (${dept.name}).</p>
          <p>Create or sign in to your account with this email, then contact IT if your role is not visible within a few minutes of acceptance.</p>`,
        ctaLabel: "Sign in to GITDM",
        ctaHref: `${appUrl}/auth/sign-in`,
      }),
      event: "STAFF_INVITE",
    });
  } catch (e) {
    console.warn("[staff-invite] email failed", e);
  }

  return invitation;
}

export async function listPendingInvitations() {
  const db = getDb();
  if (!db) return [];
  return db.staffInvitation.findMany({
    where: { status: "PENDING" },
    include: {
      department: true,
      invitedBy: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * When a user signs in with a matching invited email, attach the role.
 * Call from dashboard/bootstrap if needed.
 */
export async function acceptPendingInvitationsForUser(userId: string, email: string) {
  const db = getDb();
  if (!db) return [];

  const pending = await db.staffInvitation.findMany({
    where: {
      email: email.trim().toLowerCase(),
      status: "PENDING",
    },
  });

  const accepted = [];
  for (const inv of pending) {
    const role = await db.role.findFirst({ where: { code: inv.roleCode as any } });
    if (!role) continue;

    await db.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId: role.id },
      },
      create: { userId, roleId: role.id },
      update: {},
    });

    await db.staffInvitation.update({
      where: { id: inv.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    accepted.push(inv);
  }

  return accepted;
}
