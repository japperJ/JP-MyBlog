import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyTOTP } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { secret, token } = body;

    if (!secret || !token) {
      return NextResponse.json(
        { error: 'Secret and token are required' },
        { status: 400 }
      );
    }

    // Verify the token against the secret
    const isValid = verifyTOTP(token, secret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Enable MFA for the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'MFA enabled successfully',
    });
  } catch (error) {
    console.error('Enable MFA error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to enable MFA' },
      { status: 500 }
    );
  }
}
