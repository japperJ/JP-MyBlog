import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

const LOCAL_DATABASE_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Configure one external PostgreSQL database for local, preview, and hosted development."
    );
  }

  return databaseUrl;
}

function assertHostedDatabaseContract(databaseUrl: string) {
  const isVercelHosted =
    process.env.VERCEL === "1" ||
    process.env.VERCEL === "true" ||
    Boolean(process.env.VERCEL_URL);

  if (!isVercelHosted) {
    return;
  }

  let hostname: string;

  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection string.");
  }

  if (LOCAL_DATABASE_HOSTNAMES.has(hostname)) {
    throw new Error(
      "Vercel-hosted deployments require an external PostgreSQL DATABASE_URL. Localhost database hosts are unsupported."
    );
  }
}

const databaseUrl = getDatabaseUrl();
assertHostedDatabaseContract(databaseUrl);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
