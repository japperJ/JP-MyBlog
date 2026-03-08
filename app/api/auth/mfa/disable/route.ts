import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, destroyOtherSessions } from '@/lib/auth';
import { verifyTOTP } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const disableSchema = z.object({
  token: z.string().regex(/^\d{6}$/, 'Token must be a 6-digit code'),
});

export async function POST(request: NextRequest) {
  // 5 attempts per 60 seconds per IP
  const { allowed, retryAfterMs } = rateLimit(
    `mfa-disable:${getClientIp(request.headers)}`,
    { limit: 5, windowMs: 60_000 }
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      }
    );
  }
  try {
    const user = await requireAuth();

    const body = await request.json();
    const { token } = disableSchema.parse(body);

    // Fetch the current MFA secret to verify the token
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!dbUser?.mfaEnabled || !dbUser.mfaSecret) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Require valid TOTP before disabling
    const isValid = await verifyTOTP(token, dbUser.mfaSecret);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // Disable MFA for the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    // Invalidate all other sessions — existing sessions were created without
    // this MFA requirement and should no longer be trusted.
    await destroyOtherSessions(user.id);

    return NextResponse.json({
      success: true,
      message: 'MFA disabled successfully',
    });
  } catch (error) {
    console.error('Disable MFA error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}
