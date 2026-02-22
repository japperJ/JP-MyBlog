import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifyTOTP } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Fetch the server-generated pending secret — never trust the client-supplied secret
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { pendingMfaSecret: true },
    });

    if (!dbUser?.pendingMfaSecret) {
      return NextResponse.json(
        { error: 'No pending MFA setup found. Please generate a new QR code.' },
        { status: 400 }
      );
    }

    // Verify the token against the server-held secret
    const isValid = verifyTOTP(token, dbUser.pendingMfaSecret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Promote pendingMfaSecret → mfaSecret and enable MFA
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaEnabled: true,
        mfaSecret: dbUser.pendingMfaSecret,
        pendingMfaSecret: null,
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
