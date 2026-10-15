import { auth } from "@/lib/auth/server";

/**
 * Next.js 16 renamed middleware → proxy.
 * Neon Auth must refresh the signed session_data cookie on every protected
 * request. Server Components cannot write cookies; without this proxy the
 * session appears lost after the first navigation (the login loop).
 *
 * File must be named proxy.ts (not middleware.ts) for Next.js 16.3+.
 */
export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  matcher: [
    "/student",
    "/student/:path*",
    "/staff",
    "/staff/:path*",
    "/applicant",
    "/applicant/:path*",
    "/parent",
    "/parent/:path*",
    "/campus",
    "/campus/:path*",
    "/admissions/apply",
    "/admissions/apply/:path*",
    "/dashboard",
    "/dashboard/:path*",
  ],
};
