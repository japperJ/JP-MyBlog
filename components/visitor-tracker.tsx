"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { VISITOR_ID_STORAGE_KEY } from "@/lib/visitor-events";

const VISITOR_ID_COOKIE_NAME = "visitor_id";
const RECENT_EVENT_WINDOW_MS = 5_000;

function createVisitorId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function persistVisitorId(visitorId: string) {
  window.localStorage.setItem(VISITOR_ID_STORAGE_KEY, visitorId);
  document.cookie = `${VISITOR_ID_COOKIE_NAME}=${encodeURIComponent(visitorId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

function getExistingVisitorId(): string | null {
  const local = window.localStorage.getItem(VISITOR_ID_STORAGE_KEY);
  if (local) {
    return local;
  }

  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${VISITOR_ID_COOKIE_NAME}=`));

  if (!match) {
    return null;
  }

  return decodeURIComponent(match.split("=")[1] ?? "");
}

function getOrCreateVisitorId(): string {
  const existing = getExistingVisitorId();
  if (existing) {
    persistVisitorId(existing);
    return existing;
  }

  const visitorId = createVisitorId();
  persistVisitorId(visitorId);
  return visitorId;
}

function sendPageView(payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/analytics/ingest", blob);
    return;
  }

  void fetch("/api/analytics/ingest", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {
    // Best effort only — analytics should never break navigation.
  });
}

export function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrlRef = useRef<string | null>(null);
  const lastEventKeyRef = useRef<string | null>(null);
  const lastEventAtRef = useRef<number>(0);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const visitorId = getOrCreateVisitorId();
    const queryString = searchParams.toString();
    const relativeUrl = queryString ? `${pathname}?${queryString}` : pathname;
    const dedupeKey = `${visitorId}:${relativeUrl}`;
    const now = Date.now();

    if (
      lastEventKeyRef.current === dedupeKey &&
      now - lastEventAtRef.current < RECENT_EVENT_WINDOW_MS
    ) {
      previousUrlRef.current = window.location.href;
      return;
    }

    sendPageView({
      eventType: "page_view",
      pathname,
      fullUrl: window.location.href,
      queryString: queryString ? `?${queryString}` : null,
      referrer: previousUrlRef.current ?? document.referrer ?? null,
      visitorId,
      metadata: {
        pageTitle: document.title,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    });

    lastEventKeyRef.current = dedupeKey;
    lastEventAtRef.current = now;
    previousUrlRef.current = window.location.href;
  }, [pathname, searchParams]);

  return null;
}