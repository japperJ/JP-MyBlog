import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { generateMFASetup } from '@/lib/mfa';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Generate MFA setup data
    const mfaSetup = await generateMFASetup(user.email);

    return NextResponse.json({
      secret: mfaSetup.secret,
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
