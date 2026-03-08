import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function createLoginRedirect(origin: string, pathname: string) {
  const loginUrl = new URL("/admin/login", origin);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

function createAdminRedirect(origin: string) {
  const adminUrl = new URL("/admin", origin);
  adminUrl.searchParams.set("denied", "users");
  return NextResponse.redirect(adminUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  if (pathname === "/admin/login" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const sessionCookie = request.cookies.get("auth_session");

    if (!sessionCookie) {
      return createLoginRedirect(origin, pathname);
    }

    try {
      const sessionCheck = await fetch(new URL("/api/auth/session", origin), {
        headers: {
          Cookie: `auth_session=${sessionCookie.value}`,
        },
        cache: "no-store",
      });

      if (!sessionCheck.ok) {
        return createLoginRedirect(origin, pathname);
      }

      const sessionData = await sessionCheck.json();
      if (pathname.startsWith("/admin/users") && sessionData.user?.role !== "admin") {
        return createAdminRedirect(origin);
      }

      if (
        sessionData.user?.mfaRequired &&
        !sessionData.user?.mfaEnabled &&
        pathname !== "/admin/settings"
      ) {
        const settingsUrl = new URL("/admin/settings", origin);
        settingsUrl.searchParams.set("mfa-required", "1");
        return NextResponse.redirect(settingsUrl);
      }
    } catch (error) {
      console.error("Session verification error", {
        route: "middleware",
        pathname,
        origin,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });

      return createLoginRedirect(origin, pathname);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
