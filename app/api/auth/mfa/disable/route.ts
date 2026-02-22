import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

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
    return NextResponse.json(
      { error: 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}
