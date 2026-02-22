import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  action: z.enum(['disable-mfa', 'require-mfa', 'unrequire-mfa']),
});

// PATCH - Admin MFA management actions
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await requireAdmin();
    const { id } = await context.params;
    const body = await request.json();
    const { action } = patchSchema.parse(body);

    if (action === 'disable-mfa') {
      // Admins cannot disable their own MFA via this route — use /api/auth/mfa/disable
      if (currentUser.id === id) {
        return NextResponse.json(
          { error: 'Use the Security Settings page to disable your own MFA.' },
          { status: 400 }
        );
      }

      await prisma.user.update({
        where: { id },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          pendingMfaSecret: null,
          // Keep mfaRequired intact — admin may still want them to re-enroll
        },
      });

      // Invalidate all sessions for the target user so they must log in again
      await prisma.session.deleteMany({ where: { userId: id } });

      return NextResponse.json({ success: true, message: 'MFA disabled for user.' });
    }

    if (action === 'require-mfa') {
      await prisma.user.update({
        where: { id },
        data: { mfaRequired: true },
      });
      return NextResponse.json({ success: true, message: 'MFA is now required for this user.' });
    }

    if (action === 'unrequire-mfa') {
      await prisma.user.update({
        where: { id },
        data: { mfaRequired: false },
      });
      return NextResponse.json({ success: true, message: 'MFA requirement removed.' });
    }
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}

// DELETE - Delete a user
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const currentUser = await requireAdmin();
    const { id } = await context.params;

    // Prevent deleting yourself
    if (currentUser.id === id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
