import { auth } from "@/lib/auth/server";

/**
 * Normalized GITDM authentication session.
 * Never throws during static generation (cookies unavailable).
 *
 * Prefer calling this from force-dynamic Server Components or from routes
 * covered by src/middleware.ts so the session cookie stays fresh.
 */
export async function getAuthSession() {
  try {
    const result = (await auth.getSession()) as {
      data?: unknown;
      error?: { message?: string; code?: string } | null;
    };

    if (result.error) {
      console.warn(
        "[GITDM auth-session] getSession error:",
        result.error.code || result.error.message || result.error,
      );
      return null;
    }

    if (!result.data || typeof result.data !== "object") {
      return null;
    }

    const data = result.data as {
      user?: {
        id?: string;
        email?: string;
        name?: string | null;
        image?: string | null;
        emailVerified?: boolean;
      } | null;
      session?: unknown;
    };

    if (!data.user?.id || !data.user.email) return null;

    return {
      user: {
        sub: data.user.id,
        email: data.user.email,
        name: data.user.name ?? null,
        nickname: null,
        preferred_username: null,
        given_name: data.user.name?.split(/\s+/)[0] ?? null,
        family_name: data.user.name?.split(/\s+/).slice(1).join(" ") || null,
        picture: data.user.image ?? null,
        emailVerified: Boolean(data.user.emailVerified),
      },
      session: data.session ?? null,
    };
  } catch (error) {
    // Static prerender / missing cookies — treat as signed out
    console.warn("[GITDM auth-session] getSession threw:", error);
    return null;
  }
}
