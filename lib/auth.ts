import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

export interface Session {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    mfaEnabled?: boolean;
    mfaRequired?: boolean;
  };
}

export const SESSION_COOKIE_NAME = "auth_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    // No domain attribute => host-only cookie per localhost / preview / production origin.
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    expires: expiresAt,
    path: "/",
  };
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findFirst({
    where: {
      token: sessionToken,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mfaEnabled: true,
          mfaRequired: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  return {
    user: session.user,
  };
}

export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

export async function requireAdmin() {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return user;
}

/**
 * Delete all sessions for a user except the current one.
 * Call after MFA enable/disable to invalidate sessions created before the
 * security-level change.
 */
export async function destroyOtherSessions(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  await prisma.session.deleteMany({
    where: {
      userId,
      ...(currentToken ? { NOT: { token: currentToken } } : {}),
    },
  });
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiresAt));

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await prisma.session.deleteMany({
      where: {
        token: sessionToken,
      },
    });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...getSessionCookieOptions(new Date(0)),
    expires: new Date(0),
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
