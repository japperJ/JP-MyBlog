import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateMFASetup } from "@/lib/mfa";
import { prisma } from "@/lib/prisma";

function isConfigurationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("DATABASE_URL") || error.message.includes("MFA_TOKEN_SECRET"))
  );
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const mfaSetup = await generateMFASetup(user.email);

    await prisma.user.update({
      where: { id: user.id },
      data: { pendingMfaSecret: mfaSetup.secret },
    });

    return NextResponse.json({
      secret: mfaSetup.secret,
      qrCode: mfaSetup.qrCode,
    });
  } catch (error) {
    console.error("Generate MFA error", {
      route: "/api/auth/mfa/generate",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({ error: "Failed to generate MFA setup" }, { status: 500 });
  }
}
