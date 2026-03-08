import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createMfaToken } from "@/lib/mfa-token";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function isConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("DATABASE_URL") || error.message.includes("MFA_TOKEN_SECRET"))
  );
}

function logRouteError(error: unknown) {
  console.error("Login error", {
    route: "/api/auth/login",
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
  });
}

export async function POST(request: NextRequest) {
  const { allowed, retryAfterMs } = rateLimit(`login:${getClientIp(request.headers)}`, {
    limit: 5,
    windowMs: 60_000,
  });

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.mfaEnabled) {
      const mfaToken = createMfaToken(user.id);
      return NextResponse.json({
        mfaRequired: true,
        mfaToken,
      });
    }

    await createSession(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logRouteError(error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    if (isConfigurationError(error)) {
      return NextResponse.json(
        {
          error:
            "Server configuration error. Check DATABASE_URL and MFA_TOKEN_SECRET for this environment.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
