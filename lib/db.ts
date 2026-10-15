import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Production-safe Prisma/PostgreSQL client for Next.js/Vercel.
 *
 * Prisma 7's pg adapter creates the driver pool from this configuration. Keep
 * the client in the warm server global and explicitly cap the pool so a burst
 * of dynamic pages cannot create an unnecessarily large number of database
 * connections per Vercel instance.
 */
const globalForDb = globalThis as unknown as { gitdmDb?: PrismaClient };

function createDb() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX || 8),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    allowExitOnIdle: true,
  });

  return new PrismaClient({ adapter });
}

export function getDb() {
  if (!process.env.DATABASE_URL?.trim()) {
    return null;
  }
  if (!globalForDb.gitdmDb) {
    globalForDb.gitdmDb = createDb();
  }
  return globalForDb.gitdmDb;
}

/** @deprecated Prefer getDb() when database may be unavailable */
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb();
    if (!client) {
      throw new Error("DATABASE_URL is not configured.");
    }
    return Reflect.get(client, prop, receiver);
  },
});
