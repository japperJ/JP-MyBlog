import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getConfiguredAppOrigin } from "@/lib/runtime-config";

const DEFAULT_THUMBNAIL_KEY = "defaultThumbnailUrl";

let schemaReady = false;
let bootstrapPromise: Promise<boolean> | null = null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeStoredThumbnailValue(value: string): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    return null;
  }

  return null;
}

function resolveThumbnailValue(value: string): string | null {
  const stored = normalizeStoredThumbnailValue(value);

  if (!stored) {
    return null;
  }

  if (stored.startsWith("/")) {
    return new URL(stored, getConfiguredAppOrigin()).toString();
  }

  return stored;
}

export function isSiteSettingsSchemaMissingError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return (
    code === "P2021" ||
    (message.includes("site_settings") &&
      (message.includes("does not exist") ||
        message.includes("doesn't exist") ||
        message.includes("not exist")))
  );
}

export async function ensureSiteSettingsSchema(): Promise<boolean> {
  if (schemaReady) {
    return true;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "site_settings" (
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
        )
      `);

      schemaReady = true;
      return true;
    } catch (error) {
      console.error("Failed to ensure site_settings schema", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      return false;
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

export const getDefaultThumbnailUrl = cache(async (): Promise<string | null> => {
  if (!(await ensureSiteSettingsSchema())) {
    return null;
  }

  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: DEFAULT_THUMBNAIL_KEY },
      select: { value: true },
    });

    return setting ? resolveThumbnailValue(setting.value) : null;
  } catch (error) {
    if (!isSiteSettingsSchemaMissingError(error)) {
      console.error("Failed to load default thumbnail setting", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }

    return null;
  }
});

export async function setDefaultThumbnailSetting(value: string): Promise<string | null> {
  const storedValue = normalizeStoredThumbnailValue(value);

  if (!storedValue) {
    return null;
  }

  if (!(await ensureSiteSettingsSchema())) {
    return null;
  }

  try {
    await prisma.siteSetting.upsert({
      where: { key: DEFAULT_THUMBNAIL_KEY },
      create: {
        key: DEFAULT_THUMBNAIL_KEY,
        value: storedValue,
      },
      update: {
        value: storedValue,
      },
    });

    return resolveThumbnailValue(storedValue);
  } catch (error) {
    console.error("Failed to save default thumbnail setting", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return null;
  }
}

export async function clearDefaultThumbnailSetting(): Promise<void> {
  if (!(await ensureSiteSettingsSchema())) {
    return;
  }

  try {
    await prisma.siteSetting.deleteMany({
      where: { key: DEFAULT_THUMBNAIL_KEY },
    });
  } catch (error) {
    if (!isSiteSettingsSchemaMissingError(error)) {
      console.error("Failed to clear default thumbnail setting", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
  }
}