import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for login page and API auth routes
  if (
    pathname === "/admin/login" ||
    pathname.startsWith("/api/auth/")
  ) {
    return NextResponse.next();
  }

  // Check if accessing admin routes
  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("auth_session");

    if (!sessionCookie) {
      // No session cookie, redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify session is valid by checking with the API
    try {
      const sessionCheck = await fetch(
        new URL("/api/auth/session", request.url),
        {
          headers: {
            Cookie: `auth_session=${sessionCookie.value}`,
          },
        }
      );

      if (!sessionCheck.ok) {
        // Invalid session, redirect to login
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error("Session verification error:", error);
      // On error, redirect to login
      const loginUrl = new URL("/admin/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
