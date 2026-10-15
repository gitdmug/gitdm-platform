/**
 * Central support ticket routing — all student tickets go to Student Affairs.
 * Categories: ACADEMIC, WELFARE, ADMINISTRATIVE, TECHNICAL, FINANCE, OTHER
 */

import { getDb } from "@/lib/db";

export const TICKET_CATEGORIES = [
  "ACADEMIC",
  "WELFARE",
  "ADMINISTRATIVE",
  "TECHNICAL",
  "FINANCE",
  "GENERAL",
] as const;

export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export async function createSupportTicket(params: {
  requesterId: string;
  subject: string;
  description: string;
  category?: TicketCategory;
  priority?: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const ticket = await db.supportTicket.create({
    data: {
      requesterId: params.requesterId,
      subject: params.subject.trim(),
      description: params.description.trim(),
      category: params.category || "GENERAL",
      priority: params.priority || "NORMAL",
      status: "OPEN",
    },
  });

  await db.notification.create({
    data: {
      userId: params.requesterId,
      type: "SUPPORT",
      title: "Support ticket submitted",
      body: `Your ticket "${ticket.subject}" has been received by Student Affairs. Reference: ${ticket.id.slice(-8).toUpperCase()}`,
    },
  });

  // Notify Student Affairs staff (best-effort)
  try {
    const saStaff = await db.userRole.findMany({
      where: { role: { code: { in: ["STUDENT_AFFAIRS", "PRINCIPAL"] } } },
      select: { userId: true },
      take: 20,
    });
    for (const s of saStaff) {
      if (s.userId === params.requesterId) continue;
      await db.notification.create({
        data: {
          userId: s.userId,
          type: "SUPPORT",
          title: "New support ticket",
          body: `${params.category || "GENERAL"}: ${ticket.subject}`,
        },
      });
    }
  } catch {
    // non-blocking
  }

  await db.auditLog.create({
    data: {
      userId: params.requesterId,
      action: "SUPPORT_TICKET_CREATED",
      entity: "SupportTicket",
      entityId: ticket.id,
      metadataJson: JSON.stringify({ category: ticket.category }),
    },
  });

  return ticket;
}

export async function respondToTicket(params: {
  ticketId: string;
  staffId: string;
  reply: string;
  status?: "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const status = params.status || "IN_PROGRESS";
  const ticket = await db.supportTicket.update({
    where: { id: params.ticketId },
    data: {
      staffReply: params.reply.trim(),
      status,
      assigneeId: params.staffId,
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });

  await db.notification.create({
    data: {
      userId: ticket.requesterId,
      type: "SUPPORT",
      title: "Update on your support ticket",
      body: params.reply.trim().slice(0, 280),
    },
  });

  await db.auditLog.create({
    data: {
      userId: params.staffId,
      action: "SUPPORT_TICKET_UPDATED",
      entity: "SupportTicket",
      entityId: params.ticketId,
      metadataJson: JSON.stringify({ status }),
    },
  });

  return ticket;
}

export async function listOpenTickets(opts?: { category?: string }) {
  const db = getDb();
  if (!db) return [];

  return db.supportTicket.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS", "WAITING"] },
      ...(opts?.category ? { category: opts.category } : {}),
    },
    include: {
      requester: { select: { id: true, email: true, firstName: true, lastName: true } },
      assignee: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
  });
}
