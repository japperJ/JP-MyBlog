import { cookies } from "next/headers";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

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

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await prisma.session.findUnique({
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

/** Throws 'Unauthorized' if the caller is not authenticated or not an admin. */
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
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });

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

  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
