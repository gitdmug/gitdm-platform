import { getDb } from "@/lib/db";

/**
 * List published announcements.
 * Tolerant of schema drift (e.g. expiresAt not yet migrated) so public pages
 * never break the production build or homepage.
 */
export async function listPublishedAnnouncements(audience?: string) {
  const db = getDb();
  if (!db) return [];

  try {
    const now = new Date();
    return await db.announcement.findMany({
      where: {
        publishedAt: { lte: now, not: null },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(audience
          ? {
              OR: [{ audience: "ALL" }, { audience }, { audience: null }],
            }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
    });
  } catch (err) {
    console.warn("[announcements] primary query failed, trying without expiresAt", err);
    try {
      const now = new Date();
      // Fallback if expiresAt column is missing in the live database
      return await db.announcement.findMany({
        where: {
          publishedAt: { lte: now, not: null },
          ...(audience
            ? {
                OR: [{ audience: "ALL" }, { audience }, { audience: null }],
              }
            : {}),
        },
        orderBy: { publishedAt: "desc" },
        take: 30,
        select: {
          id: true,
          title: true,
          body: true,
          audience: true,
          publishedAt: true,
          createdAt: true,
          createdById: true,
        },
      });
    } catch (err2) {
      console.warn("[announcements] unavailable", err2);
      return [];
    }
  }
}

export async function publishAnnouncement(params: {
  title: string;
  body: string;
  audience?: string;
  expiresAt?: Date | null;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const data: Record<string, unknown> = {
    title: params.title.trim(),
    body: params.body.trim(),
    audience: params.audience || "ALL",
    publishedAt: new Date(),
    createdById: params.actorId,
  };
  if (params.expiresAt !== undefined) {
    data.expiresAt = params.expiresAt;
  }

  try {
    const ann = await db.announcement.create({ data: data as any });
    await db.auditLog.create({
      data: {
        userId: params.actorId,
        action: "ANNOUNCEMENT_PUBLISHED",
        entity: "Announcement",
        entityId: ann.id,
      },
    });
    return ann;
  } catch (e) {
    // Retry without expiresAt if column missing
    delete data.expiresAt;
    const ann = await db.announcement.create({ data: data as any });
    return ann;
  }
}
