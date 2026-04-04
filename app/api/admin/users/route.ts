import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createVisitorEvent } from '@/lib/visitor-events';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['admin', 'editor']).default('admin'),
});

// GET - List all users
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        mfaRequired: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await createVisitorEvent({
      eventType: 'admin_users_list',
      source: 'admin',
      request,
      pathname: '/api/admin/users',
      responseStatus: 200,
      userId: currentUser.id,
      authenticated: true,
      metadata: {
        resultCount: users.length,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  try {
    const currentUser = await requireAdmin();

    const body = await request.json();
    const { email, name, password, role } = createUserSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      await createVisitorEvent({
        eventType: 'admin_user_create_conflict',
        source: 'admin',
        request,
        pathname: '/api/admin/users',
        responseStatus: 400,
        durationMs: Date.now() - startedAt,
        userId: currentUser.id,
        authenticated: true,
        metadata: { email, role },
      });

      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    await createVisitorEvent({
      eventType: 'admin_user_create',
      source: 'admin',
      request,
      pathname: '/api/admin/users',
      responseStatus: 201,
      durationMs: Date.now() - startedAt,
      userId: currentUser.id,
      authenticated: true,
      metadata: {
        targetUserId: user.id,
        targetEmail: user.email,
        targetRole: user.role,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      await createVisitorEvent({
        eventType: 'admin_user_create_validation_error',
        source: 'admin',
        request,
        pathname: '/api/admin/users',
        responseStatus: 400,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    await createVisitorEvent({
      eventType: 'admin_user_create_error',
      source: 'admin',
      request,
      pathname: '/api/admin/users',
      responseStatus: 500,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
