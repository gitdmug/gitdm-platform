import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 configuration.
 * DATABASE_URL is read at CLI time (db push / migrate).
 * Runtime uses the pg adapter in src/lib/db.ts instead.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
