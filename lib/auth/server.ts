import { createNeonAuth } from "@neondatabase/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl) {
  throw new Error("NEON_AUTH_BASE_URL is required for GITDM authentication.");
}

if (!cookieSecret || cookieSecret.length < 32) {
  throw new Error("NEON_AUTH_COOKIE_SECRET must be configured with at least 32 characters.");
}

/**
 * Permanent session configuration for production Campus routes.
 *
 * - sessionDataTtl: how long the signed session_data cookie is trusted (7 days).
 * - sameSite: "lax" — Neon defaults to "strict", which drops the session cookie
 *   on many top-level navigations and caused the login loop in the student portal.
 * - Middleware (src/middleware.ts) refreshes cookies on every protected request;
 *   Server Components cannot write cookies, so without middleware the cache goes stale.
 */
export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 60 * 60 * 24 * 7, // 7 days
    sameSite: "lax",
  },
});
