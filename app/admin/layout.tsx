import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Shared admin layout — server-side session validation.
 *
 * Runs in the Node.js runtime (not Edge), so it can call Prisma
 * directly without a self-referencing fetch.
 *
 * The Edge middleware already rejected requests without an auth cookie,
 * so we only reach this layout when a cookie is present. Here we
 * verify it points to a live, non-expired session and enforce
 * role + MFA policies.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";

  // The login page lives under /admin but must render without a session.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // ── Session validation ───────────────────────────────────────────
  let session;
  try {
    session = await getSession();
  } catch (error) {
    console.error("Session validation error in admin layout", {
      pathname,
      error: error instanceof Error ? { message: error.message } : error,
    });
    // DB / config errors → send back to login so the user isn't stuck.
    redirect(`/admin/login?from=${encodeURIComponent(pathname)}`);
  }

  if (!session) {
    redirect(`/admin/login?from=${encodeURIComponent(pathname)}`);
  }

  // ── Role-based access ────────────────────────────────────────────
  if (pathname.startsWith("/admin/users") && session.user.role !== "admin") {
    redirect("/admin?denied=users");
  }

  // ── MFA enforcement ──────────────────────────────────────────────
  if (
    session.user.mfaRequired &&
    !session.user.mfaEnabled &&
    pathname !== "/admin/settings"
  ) {
    redirect("/admin/settings?mfa-required=1");
  }

  return <>{children}</>;
}
