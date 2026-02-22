type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

// Prune expired entries every 60 seconds to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.resetAt < now) store.delete(k);
  }
}, 60_000);

/**
 * Simple in-process rate limiter.
 * Suitable for single-instance deployments; swap for Redis-backed
 * solution (e.g. Upstash) when running multiple replicas.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  entry.count++;

  if (entry.count > limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  return { allowed: true, retryAfterMs: 0 };
}

/** Extract a best-effort client identifier from request headers. */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
