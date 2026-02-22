import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyTOTP } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const disableSchema = z.object({
  token: z.string().length(6),
});

export async function POST(request: NextRequest) {
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
    const isValid = verifyTOTP(token, dbUser.mfaSecret);
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
