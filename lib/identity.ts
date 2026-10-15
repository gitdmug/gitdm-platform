export type AuthSession = Awaited<ReturnType<typeof import("@/lib/auth-session").getAuthSession>>;
import { getDb } from "@/lib/db";
import { ensureInstitutionalRoles } from "@/lib/role-provisioning";

export async function bootstrapPrincipalIfConfigured(
  database: NonNullable<ReturnType<typeof getDb>>,
  userId: string,
  email: string,
  roleCodes: string[],
) {
  const primary = process.env.PRINCIPAL_BOOTSTRAP_EMAIL?.trim().replace(/^['"]|['"]$/g, "");
  const fromEmailPrincipal = process.env.EMAIL_PRINCIPAL?.trim().replace(/^['"]|['"]$/g, "");
  const fallbackList = (process.env.PRINCIPAL_BOOTSTRAP_EMAILS || "").split(",").map((value) => value.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
  // Exactly one bootstrap identity may hold the Principal position.
  // Accept PRINCIPAL_BOOTSTRAP_EMAIL, PRINCIPAL_BOOTSTRAP_EMAILS, or EMAIL_PRINCIPAL.
  const configured = [primary || fallbackList[0] || fromEmailPrincipal].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());

  if (!configured.includes(email.trim().toLowerCase())) return false;
  if (roleCodes.includes("PRINCIPAL")) return false;

  let principalRole = await database.role.findUnique({ where: { code: "PRINCIPAL" } });
  if (!principalRole) {
    const roles = await ensureInstitutionalRoles(database);
    const principalId = roles.get("PRINCIPAL")?.id;
    if (!principalId) return false;
    principalRole = await database.role.findUnique({ where: { id: principalId } });
  }
  if (!principalRole) return false;

  await database.userRole.upsert({
    where: { userId_roleId: { userId, roleId: principalRole.id } },
    update: {},
    create: { userId, roleId: principalRole.id },
  });

  console.info(`[GITDM identity] principal role bootstrapped for ${email}`);
  return true;
}

/**
 * Upsert the Neon Auth identity into GITDM.
 *
 * Identity synchronisation is deliberately split into a critical core
 * (User + existing roles) and optional provisioning helpers.  A stale
 * production database must not turn every authenticated page into a 500 just
 * because a newer invitation/provisioning table is unavailable.
 */
export async function syncGITDMUser(session: AuthSession | null) {
  if (!session?.user?.sub || !session.user.email) return null;

  const database = getDb();
  if (!database) return null;

  const authUserId = session.user.sub;
  const email = session.user.email.toLowerCase();
  const rawFullName =
    session.user.name ??
    session.user.nickname ??
    session.user.preferred_username ??
    null;
  const fullName = typeof rawFullName === "string" ? rawFullName.trim() : "";
  const firstName =
    session.user.given_name ?? (fullName ? fullName.split(/\s+/)[0] : null);
  const lastName =
    session.user.family_name ??
    (fullName ? fullName.split(/\s+/).slice(1).join(" ") || null : null);

  // Critical identity sync. If the institutional account already exists,
  // update it instead of creating a second role-less account.
  let user = await database.user.findUnique({ where: { authUserId } });
  let isNewUser = false;
  if (!user) {
    user = await database.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (user) {
      user = await database.user.update({
        where: { id: user.id },
        data: {
          authUserId,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          status: "ACTIVE",
        },
      });
    } else {
      user = await database.user.create({
        data: { authUserId, email, firstName, lastName, status: "ACTIVE" },
      });
      isNewUser = true;
    }
  } else {
    const changed =
      user.email !== email ||
      (firstName && user.firstName !== firstName) ||
      (lastName && user.lastName !== lastName) ||
      user.status !== "ACTIVE";
    if (changed) {
      user = await database.user.update({
        where: { id: user.id },
        data: {
          email,
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          status: "ACTIVE",
        },
      });
    }
  }

  // Principal bootstrap is handled by a lightweight helper. Existing users are
  // checked by getCurrentUser only when the configured bootstrap email matches.
  try {
    await bootstrapPrincipalIfConfigured(
      database,
      user.id,
      email,
      (await database.userRole.findMany({
        where: { userId: user.id },
        include: { role: { select: { code: true } } },
      })).map((item) => item.role.code),
    );
  } catch (error) {
    console.error("[GITDM identity] principal bootstrap failed:", error);
  }

  // Explicit role mappings are also optional. This is useful during a staged
  // production rollout, but must not make the normal portal unavailable.
  try {
    const roleMappings = (process.env.GITDM_STAFF_ROLE_EMAILS ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => {
        const separator = item.indexOf(":");
        return separator < 0
          ? null
          : {
              roleCode: item.slice(0, separator).trim().toUpperCase(),
              mappedEmail: item.slice(separator + 1).trim().toLowerCase(),
            };
      })
      .filter(
        (item): item is { roleCode: string; mappedEmail: string } =>
          Boolean(item),
      );

    for (const mapping of roleMappings) {
      if (mapping.mappedEmail !== email) continue;
      const mappedRole = await database.role.findUnique({
        where: { code: mapping.roleCode as never },
      });
      if (mappedRole) {
        await database.userRole.upsert({
          where: {
            userId_roleId: { userId: user.id, roleId: mappedRole.id },
          },
          update: {},
          create: { userId: user.id, roleId: mappedRole.id },
        });
      }
    }
  } catch (error) {
    console.error("[GITDM identity] optional role mapping skipped:", error);
  }

  // Do NOT remove an existing STUDENT role here. Role synchronisation is not
  // the place to revoke institutional access; doing so made ordinary page
  // loads mutate the user's authorization state.

  // Staff invitation acceptance is a convenience/provisioning path. It is
  // intentionally isolated so an older production schema can still serve all
  // authenticated pages while the database is being brought fully current.
  if (isNewUser) try {
    const invitation = await database.staffInvitation.findFirst({
      where: { email, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    if (invitation) {
      const departmentRoles = await database.role.findMany({
        where: { departmentId: invitation.departmentId, isActive: true, code: { notIn: ["PRINCIPAL", "STUDENT", "PARENT_GUARDIAN", "ALUMNI"] } },
      });
      for (const departmentRole of departmentRoles) {
        await database.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: departmentRole.id } },
          update: {},
          create: { userId: user.id, roleId: departmentRole.id, assignedBy: invitation.invitedById },
        });
      }

      await database.userDepartment.upsert({
        where: {
          userId_departmentId: {
            userId: user.id,
            departmentId: invitation.departmentId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          departmentId: invitation.departmentId,
        },
      });

      await database.staffInvitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });

      await database.auditLog.create({
        data: {
          userId: invitation.invitedById,
          action: "STAFF_INVITATION_ACCEPTED",
          entity: "StaffInvitation",
          entityId: invitation.id,
          metadataJson: JSON.stringify({
            staffUserId: user.id,
            email,
            departmentId: invitation.departmentId,
            provisionedDepartmentRoles: departmentRoles.map((r) => r.code),
          }),
        },
      });
    }
  } catch (error) {
    console.error("[GITDM identity] optional staff invitation sync skipped:", error);
  }


  // A learner is an institutional user whose access is determined by their
  // admission/enrolment and financial state, not by a role. We intentionally do
  // not allocate a STUDENT role to ordinary accounts. The legacy STUDENT role is
  // retained in the database only for historical compatibility.

  return user;
}
