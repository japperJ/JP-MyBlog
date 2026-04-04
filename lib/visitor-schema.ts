import { prisma } from "@/lib/prisma";

let schemaReady = false;
let bootstrapPromise: Promise<boolean> | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isVisitorEventsSchemaMissingError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return (
    code === "P2021" ||
    (message.includes("visitor_events") &&
      (message.includes("does not exist") || message.includes("doesn't exist") || message.includes("not exist")))
  );
}

export async function ensureVisitorEventsSchema(): Promise<boolean> {
  if (schemaReady) {
    return true;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "visitor_events" (
          "id" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "source" TEXT NOT NULL,
          "pathname" TEXT NOT NULL,
          "fullUrl" TEXT,
          "queryString" TEXT,
          "method" TEXT,
          "referrer" TEXT,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "browser" TEXT,
          "operatingSystem" TEXT,
          "deviceType" TEXT,
          "country" TEXT,
          "region" TEXT,
          "city" TEXT,
          "provider" TEXT,
          "visitorId" TEXT,
          "authenticated" BOOLEAN NOT NULL DEFAULT false,
          "isBot" BOOLEAN NOT NULL DEFAULT false,
          "responseStatus" INTEGER,
          "durationMs" INTEGER,
          "metadata" JSONB,
          "deploymentEnv" TEXT NOT NULL,
          "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "userId" TEXT,
          "sessionId" TEXT,
          CONSTRAINT "visitor_events_pkey" PRIMARY KEY ("id")
        )
      `);

      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          ALTER TABLE "visitor_events"
            ADD CONSTRAINT "visitor_events_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          ALTER TABLE "visitor_events"
            ADD CONSTRAINT "visitor_events_sessionId_fkey"
            FOREIGN KEY ("sessionId") REFERENCES "sessions"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);

      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_occurredAt_idx" ON "visitor_events"("occurredAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_eventType_occurredAt_idx" ON "visitor_events"("eventType", "occurredAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_source_occurredAt_idx" ON "visitor_events"("source", "occurredAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_pathname_occurredAt_idx" ON "visitor_events"("pathname", "occurredAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_visitorId_occurredAt_idx" ON "visitor_events"("visitorId", "occurredAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_userId_occurredAt_idx" ON "visitor_events"("userId", "occurredAt")`
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "visitor_events_ipAddress_occurredAt_idx" ON "visitor_events"("ipAddress", "occurredAt")`
      );

      schemaReady = true;
      return true;
    } catch (error) {
      console.error("Failed to ensure visitor_events schema", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      return false;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}
