import { getDb } from "@/lib/db";

export async function listLibraryResources(opts?: {
  scope?: string;
  availableOnly?: boolean;
}) {
  const db = getDb();
  if (!db) return [];

  const where: any = {};
  if (opts?.availableOnly !== false) where.available = true;
  if (opts?.scope) where.accessScope = opts.scope;

  return db.libraryResource.findMany({
    where,
    orderBy: { title: "asc" },
  });
}

export async function listCampusLibrary() {
  const db = getDb();
  if (!db) return [];
  return db.libraryResource.findMany({
    where: {
      available: true,
      accessScope: { in: ["CAMPUS", "ENROLLED", "PUBLIC"] },
    },
    orderBy: [{ type: "asc" }, { title: "asc" }],
  });
}

export async function addLibraryResource(params: {
  title: string;
  author?: string;
  type: string;
  description?: string;
  url?: string;
  accessScope?: string;
  actorId: string;
}) {
  const db = getDb();
  if (!db) throw new Error("Database unavailable");

  const resource = await db.libraryResource.create({
    data: {
      title: params.title.trim(),
      author: params.author?.trim() || null,
      type: params.type as any,
      description: params.description?.trim() || null,
      url: params.url?.trim() || null,
      accessScope: params.accessScope || "CAMPUS",
      available: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: params.actorId,
      action: "LIBRARY_RESOURCE_ADDED",
      entity: "LibraryResource",
      entityId: resource.id,
    },
  });

  return resource;
}
