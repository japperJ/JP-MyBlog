import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";

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
  const parts = [ipAddress ? `ip:${ipAddress}` : null, userAgent ? `ua:${userAgent}` : null].filter(
    Boolean
  );

  if (parts.length === 0) {
    return null;
  }

  return `fingerprint:${hashFingerprint(parts.join("|"))}`;
}

export async function trackPostView(input: TrackPostViewInput): Promise<{ counted: boolean }> {
  const viewerKey = resolveViewerKey(input);

  if (!viewerKey) {
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
