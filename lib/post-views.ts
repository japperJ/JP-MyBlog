import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { rateLimit } from "@/lib/rate-limit";

const FALLBACK_DEDUPE_WINDOW_MILLISECONDS = 60_000;

type TrackPostViewInput = {
  postId: string;
  userId?: string | null;
  visitorId?: string | null;
  headers?: Headers;
};

function normalize(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function hashFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function resolveViewerKey(input: TrackPostViewInput): string | null {
  const userId = normalize(input.userId);
  if (userId) {
    return `user:${userId}`;
  }

  const visitorId = normalize(input.visitorId);
  if (visitorId) {
    return `visitor:${visitorId}`;
  }

  const userAgent = normalize(input.headers?.get("user-agent"));
  const ipAddress = normalize(input.headers ? getClientIp(input.headers) : null);
  if (!ipAddress && !userAgent) {
    return null;
  }

  // Daily rotation in YYYY-MM-DD format is enough to dedupe refreshes while limiting long-term tracking.
  const dateBucket = new Date().toISOString().slice(0, 10);
  return `fingerprint:${hashFingerprint(JSON.stringify({ ipAddress, userAgent, dateBucket }))}`;
}

export async function trackPostView(input: TrackPostViewInput): Promise<{ counted: boolean }> {
  const viewerKey = resolveViewerKey(input);

  if (!viewerKey) {
    // This path is only used when we cannot derive user ID, visitor ID, IP, or user-agent.
    // Apply a short global guard to reduce rapid inflation from unidentified requests.
    const fallbackRateLimitResult: { allowed: boolean; retryAfterMs: number } = rateLimit(`post-view:fallback:${input.postId}`, {
      limit: 1,
      windowMs: FALLBACK_DEDUPE_WINDOW_MILLISECONDS,
    });
    if (!fallbackRateLimitResult.allowed) {
      return { counted: false };
    }

    await prisma.post.update({
      where: { id: input.postId },
      data: { views: { increment: 1 } },
    });

    return { counted: true };
  }

  const inserted = await prisma.postView.createMany({
    data: [{ postId: input.postId, viewerKey }],
    skipDuplicates: true,
  });

  if (inserted.count > 0) {
    await prisma.post.update({
      where: { id: input.postId },
      data: { views: { increment: 1 } },
    });
    return { counted: true };
  }

  return { counted: false };
}
