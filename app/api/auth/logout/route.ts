import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession } from "@/lib/auth";
import { createVisitorEvent } from "@/lib/visitor-events";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const session = await getSession();
    await destroySession();

    await createVisitorEvent({
      eventType: "logout",
      source: "auth",
      request,
      pathname: "/api/auth/logout",
      responseStatus: 200,
      durationMs: Date.now() - startedAt,
      userId: session?.user.id ?? null,
      sessionId: session?.id ?? null,
      authenticated: Boolean(session),
      metadata: session
        ? {
            email: session.user.email,
            role: session.user.role,
          }
        : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    await createVisitorEvent({
      eventType: "logout_error",
      source: "auth",
      request,
      pathname: "/api/auth/logout",
      responseStatus: 500,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}
