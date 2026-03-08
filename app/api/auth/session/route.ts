import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
    });
  } catch (error) {
    console.error("Session check error", {
      route: "/api/auth/session",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    return NextResponse.json(
      {
        authenticated: false,
        error: "Session lookup failed. Check DATABASE_URL for this environment.",
      },
      { status: 500 }
    );
  }
}
