import { getDb } from "@/lib/db";

/**
 * Safe catalogue loaders that degrade gracefully when the live database
 * schema has not been fully migrated (missing columns / enum values).
 */

export async function listPublishedProgrammes(): Promise<any[]> {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.programme.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ applicationsOpen: "desc" }, { durationMonths: "asc" }, { name: "asc" }],
      include: {
        periods: { orderBy: { sequence: "asc" } },
        courses: {
          where: { published: true },
          select: { id: true },
        },
        rules: true,
      },
    });
  } catch (err) {
    console.warn("[safe-db] full programme query failed", err);
    try {
      return await db.programme.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { name: "asc" },
        include: {
          periods: true,
          courses: { select: { id: true } },
        },
      });
    } catch (err2) {
      console.warn("[safe-db] simple programme query failed", err2);
      try {
        return await db.programme.findMany({ orderBy: { name: "asc" } });
      } catch (err3) {
        console.error("[safe-db] programme catalogue unavailable", err3);
        return [];
      }
    }
  }
}

export async function listOpenApplicationProgrammes(): Promise<any[]> {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.programme.findMany({
      where: {
        status: "PUBLISHED",
        requiresApplication: true,
        applicationsOpen: true,
      },
      orderBy: { durationMonths: "asc" },
      include: {
        periods: { orderBy: { sequence: "asc" }, take: 1 },
      },
    });
  } catch (err) {
    console.warn("[safe-db] open programmes query failed", err);
    try {
      return await db.programme.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { name: "asc" },
        include: { periods: true },
      });
    } catch {
      return [];
    }
  }
}

export async function safeUserEnrollments(userId: string): Promise<any[]> {
  const db = getDb();
  if (!db) return [];

  try {
    return await db.enrollment.findMany({
      where: { userId, status: { in: ["PENDING", "ACTIVE", "REPEATING", "COMPLETED"] } },
      orderBy: { createdAt: "desc" },
      include: {
        programme: {
          select: {
            id: true,
            name: true,
            code: true,
            durationMonths: true,
            currency: true,
            applicationFee: true,
            tuitionFee: true,
          },
        },
      },
    });
  } catch (err) {
    console.warn("[safe-db] enrollment full query failed", err);
    try {
      return await db.enrollment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { programme: true },
      });
    } catch (err2) {
      console.warn("[safe-db] enrollment simple include failed", err2);
      try {
        const rows = await db.enrollment.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        });
        // Attach programme names when possible
        const out: any[] = [];
        for (const row of rows) {
          let programme: any = null;
          try {
            if ((row as any).programmeId) {
              programme = await db.programme.findUnique({
                where: { id: (row as any).programmeId },
                select: { id: true, name: true, code: true },
              });
            }
          } catch {
            programme = null;
          }
          out.push({ ...row, programme });
        }
        return out;
      } catch (err3) {
        console.error("[safe-db] enrollment unavailable", err3);
        return [];
      }
    }
  }
}
