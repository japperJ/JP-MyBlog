import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateMFASetup } from '@/lib/mfa';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Generate MFA setup data
    const mfaSetup = await generateMFASetup(user.email);

    // Store the server-generated secret so the enable endpoint
    // does not have to trust the value submitted by the client.
    await prisma.user.update({
      where: { id: user.id },
      data: { pendingMfaSecret: mfaSetup.secret },
    });

    return NextResponse.json({
      secret: mfaSetup.secret, // returned only so the user can enter it manually in their authenticator
      qrCode: mfaSetup.qrCode,
    });
  } catch (error) {
    console.error('Generate MFA error:', error);
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}
