import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyTOTP } from '@/lib/mfa';
import { createSession } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyMfaToken } from '@/lib/mfa-token';

const verifySchema = z.object({
  mfaToken: z.string().min(1),
  token: z.string().regex(/^\d{6}$/, 'Token must be a 6-digit code'),
});

export async function POST(request: NextRequest) {
  // 5 attempts per 60 seconds per IP
  const { allowed, retryAfterMs } = rateLimit(
    `mfa:${getClientIp(request.headers)}`,
    { limit: 5, windowMs: 60_000 }
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again later." },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }

  try {
    const body = await request.json();
    const { mfaToken, token } = verifySchema.parse(body);

    // Validate the signed token issued by /api/auth/login
    const userId = verifyMfaToken(mfaToken);
    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or expired MFA session. Please log in again.' },
        { status: 401 }
      );
    }

    // Find user with MFA enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'Invalid MFA setup' },
        { status: 400 }
      );
    }

    // Verify TOTP token
    const isValid = verifyTOTP(token, user.mfaSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Create session
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
    console.error('MFA verification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
