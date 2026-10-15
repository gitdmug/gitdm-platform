import type { MetadataRoute } from "next";
import { getPublicAppUrl } from "@/lib/pesapal";
import { getDb } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getPublicAppUrl();
  const staticRoutes = [
    "",
    "/about",
    "/programmes",
    "/admissions",
    "/admissions/apply",
    "/announcements",
    "/partners",
    "/research",
    "/contact",
    "/trading-floor",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  let programmeRoutes: MetadataRoute.Sitemap = [];
  try {
    const db = getDb();
    if (db) {
      const programmes = await db.programme.findMany({
        where: { status: "PUBLISHED" },
        select: { code: true, updatedAt: true },
      });
      programmeRoutes = programmes.map((p) => ({
        url: `${base}/programmes#${p.code.toLowerCase()}`,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
    }
  } catch {
    // ignore
  }

  return [...staticRoutes, ...programmeRoutes];
}
