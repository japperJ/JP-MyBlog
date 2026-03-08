import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge Middleware — lightweight cookie-presence gate.
 *
 * Why no fetch to /api/auth/session here?
 * ─────────────────────────────────────────
 * Middleware runs in the Edge Runtime. Fetching our own API route
 * ("/api/auth/session") from inside middleware creates a self-referencing
 * request that passes back through the Vercel routing layer. On the Hobby
 * tier (limited concurrency, serverless cold-starts) this reliably
 * deadlocks — the Edge function blocks waiting for the serverless function
 * which is queued behind the same Edge invocation.
 *
 * Instead, middleware only checks that the auth cookie *exists*.
 * Full session + role + MFA validation happens in the admin layout
 * (app/admin/layout.tsx), which runs in the Node.js runtime and can
 * call Prisma directly — no extra HTTP round-trip.
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API auth routes never need a session gate.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    // Always forward the pathname so the admin layout can distinguish
    // the login page from protected pages.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);

    // The login page renders without a session.
    if (pathname === "/admin/login") {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const sessionCookie = request.cookies.get("auth_session");

    if (!sessionCookie) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Cookie exists — let the admin layout do full validation.
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
