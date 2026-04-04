import type { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getClientIp } from "@/lib/rate-limit";

export const VISITOR_ID_STORAGE_KEY = "visitor_id";

export type VisitorEventSource = "client-beacon" | "auth" | "admin" | "api";

type EventRequest = Pick<Request, "headers" | "method" | "url">;

type SessionSnapshot = {
  id: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
};

export type VisitorEventInput = {
  eventType: string;
  source: VisitorEventSource;
  request?: EventRequest | NextRequest;
  pathname?: string;
  fullUrl?: string | null;
  queryString?: string | null;
  method?: string | null;
  referrer?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  visitorId?: string | null;
  authenticated?: boolean;
  userId?: string | null;
  sessionId?: string | null;
  responseStatus?: number;
  durationMs?: number;
  metadata?: Prisma.InputJsonValue;
  occurredAt?: Date;
};

type UserAgentInfo = {
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
};

async function safeGetSession(): Promise<SessionSnapshot | null> {
  try {
    const session = await getSession();
    if (!session) {
      return null;
    }

    return {
      id: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      },
    };
  } catch {
    return null;
  }
}

function getDeploymentEnvironment(): string {
  if (process.env.VERCEL_ENV?.trim()) {
    return process.env.VERCEL_ENV.trim();
  }

  if (process.env.VERCEL === "1" || process.env.VERCEL === "true" || process.env.VERCEL_URL) {
    return "preview";
  }

  return process.env.NODE_ENV ?? "development";
}

function safeUrl(url: string | null | undefined): URL | null {
  if (!url) {
    return null;
  }

  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function normalizeQueryString(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("?") ? trimmed : `?${trimmed}`;
}

function detectBot(userAgent: string | null): boolean {
  if (!userAgent) {
    return false;
  }

  return /bot|crawler|spider|slurp|curl|wget|headless|preview|facebookexternalhit|discordbot|linkedinbot|whatsapp|slackbot/i.test(
    userAgent
  );
}

function parseUserAgent(userAgent: string | null): UserAgentInfo {
  if (!userAgent) {
    return {
      browser: null,
      operatingSystem: null,
      deviceType: null,
    };
  }

  const browser = (() => {
    if (/Edg\//i.test(userAgent)) return "Edge";
    if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Chrome";
    if (/Firefox\//i.test(userAgent)) return "Firefox";
    if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
    if (/OPR\//i.test(userAgent) || /Opera/i.test(userAgent)) return "Opera";
    return "Other";
  })();

  const operatingSystem = (() => {
    if (/Windows/i.test(userAgent)) return "Windows";
    if (/Android/i.test(userAgent)) return "Android";
    if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
    if (/Mac OS X|Macintosh/i.test(userAgent)) return "macOS";
    if (/Linux/i.test(userAgent)) return "Linux";
    return "Other";
  })();

  const deviceType = (() => {
    if (/bot|crawler|spider/i.test(userAgent)) return "bot";
    if (/Tablet|iPad/i.test(userAgent)) return "tablet";
    if (/Mobile|iPhone|Android/i.test(userAgent)) return "mobile";
    return "desktop";
  })();

  return { browser, operatingSystem, deviceType };
}

function getGeoHeaders(headers: Headers) {
  const country = headers.get("x-vercel-ip-country")?.trim() || null;
  const region = headers.get("x-vercel-ip-country-region")?.trim() || null;
  const city = headers.get("x-vercel-ip-city")?.trim() || null;
  const provider =
    country || region || city || headers.get("x-vercel-id") ? "vercel" : null;

  return {
    country,
    region,
    city,
    provider,
  };
}

export function shouldExcludeVisitorPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/feed.xml" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/analytics/") ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|css|js|map|ico|txt|xml)$/i.test(pathname)
  );
}

export async function createVisitorEvent(input: VisitorEventInput): Promise<void> {
  try {
    const request = input.request;
    const requestUrl = request ? safeUrl(request.url) : safeUrl(input.fullUrl ?? null);
    const pathname = input.pathname ?? requestUrl?.pathname ?? "/";

    if (shouldExcludeVisitorPath(pathname)) {
      return;
    }

    const headers = request?.headers ?? null;
    const session =
      input.userId === undefined || input.sessionId === undefined || input.authenticated === undefined
        ? await safeGetSession()
        : null;

    const userAgent = input.userAgent ?? headers?.get("user-agent") ?? null;
    const geo = headers ? getGeoHeaders(headers) : { country: null, region: null, city: null, provider: null };
    const userAgentInfo = parseUserAgent(userAgent);
    const resolvedUserId = input.userId ?? session?.user.id ?? null;
    const resolvedSessionId = input.sessionId ?? session?.id ?? null;
    const authenticated = input.authenticated ?? Boolean(resolvedUserId);

    await prisma.visitorEvent.create({
      data: {
        eventType: input.eventType,
        source: input.source,
        pathname,
        fullUrl: input.fullUrl ?? requestUrl?.toString() ?? null,
        queryString: normalizeQueryString(input.queryString ?? requestUrl?.search ?? null),
        method: input.method ?? request?.method ?? null,
        referrer: input.referrer ?? headers?.get("referer") ?? null,
        ipAddress: input.ipAddress ?? (headers ? getClientIp(headers) : null),
        userAgent,
        browser: userAgentInfo.browser,
        operatingSystem: userAgentInfo.operatingSystem,
        deviceType: userAgentInfo.deviceType,
        country: geo.country,
        region: geo.region,
        city: geo.city,
        provider: geo.provider,
        visitorId: input.visitorId ?? null,
        authenticated,
        isBot: detectBot(userAgent),
        responseStatus: input.responseStatus,
        durationMs: input.durationMs,
        metadata: input.metadata,
        deploymentEnv: getDeploymentEnvironment(),
        occurredAt: input.occurredAt,
        userId: resolvedUserId,
        sessionId: resolvedSessionId,
      },
    });
  } catch (error) {
    console.error("Visitor event logging failed", {
      eventType: input.eventType,
      source: input.source,
      pathname: input.pathname,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
}