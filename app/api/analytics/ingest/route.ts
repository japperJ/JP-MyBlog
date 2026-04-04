import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { createVisitorEvent } from "@/lib/visitor-events";

const ingestSchema = z.object({
  eventType: z.string().trim().min(1).max(100).default("page_view"),
  pathname: z.string().trim().min(1).max(2048),
  fullUrl: z.string().trim().url().optional().nullable(),
  queryString: z.string().trim().max(4096).optional().nullable(),
  referrer: z.string().trim().max(4096).optional().nullable(),
  visitorId: z.string().trim().min(8).max(128),
  metadata: z
    .object({
      pageTitle: z.string().trim().max(512).optional(),
      language: z.string().trim().max(50).optional(),
      timezone: z.string().trim().max(100).optional(),
      viewport: z
        .object({
          width: z.number().int().min(0).max(10000),
          height: z.number().int().min(0).max(10000),
        })
        .optional(),
    })
    .passthrough()
    .optional(),
});

function parseJsonBody(body: string) {
  if (!body.trim()) {
    return {};
  }

  return JSON.parse(body);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = ingestSchema.parse(parseJsonBody(rawBody));

    await createVisitorEvent({
      eventType: body.eventType,
      source: "client-beacon",
      request,
      pathname: body.pathname,
      fullUrl: body.fullUrl,
      queryString: body.queryString,
      referrer: body.referrer,
      visitorId: body.visitorId,
      responseStatus: 202,
      metadata: body.metadata as Prisma.InputJsonValue | undefined,
    });

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
    }

    console.error("Analytics ingest error", {
      route: "/api/analytics/ingest",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    return NextResponse.json({ error: "Analytics ingest failed" }, { status: 500 });
  }
}