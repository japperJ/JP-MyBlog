import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { getConfiguredAppOrigin } from "@/lib/runtime-config";

const DEFAULT_THUMBNAIL_KEY = "defaultThumbnailUrl";
const POOL_KEY = "defaultThumbnailUrls";
const SELECTION_MODE_KEY = "defaultThumbnailSelectionMode";
const SEQUENTIAL_INDEX_KEY = "defaultThumbnailIndex";

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

// Kept for backward compatibility. Internally picks from the pool.
// Note: not wrapped in cache() because pickDefaultThumbnailUrl() has side effects.
export async function getDefaultThumbnailUrl(): Promise<string | null> {
  return pickDefaultThumbnailUrl();
}

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

// ---------------------------------------------------------------------------
// Pool management
// ---------------------------------------------------------------------------

// Reads and parses the stored JSON array of normalized URL strings.
// Returns null if missing or invalid.
async function readStoredPool(): Promise<string[] | null> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key: POOL_KEY },
      select: { value: true },
    });

    if (!setting) return null;

    const parsed: unknown = JSON.parse(setting.value);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed as string[];
    }

    return null;
  } catch {
    return null;
  }
}

async function writeStoredPool(urls: string[]): Promise<void> {
  await prisma.siteSetting.upsert({
    where: { key: POOL_KEY },
    create: { key: POOL_KEY, value: JSON.stringify(urls) },
    update: { value: JSON.stringify(urls) },
  });
}

export const getDefaultThumbnailPool = cache(async (): Promise<string[]> => {
  if (!(await ensureSiteSettingsSchema())) {
    return [];
  }

  try {
    let stored = await readStoredPool();

    // Auto-migrate: if pool is empty/missing but old single key exists, move it
    if (!stored || stored.length === 0) {
      const oldSetting = await prisma.siteSetting.findUnique({
        where: { key: DEFAULT_THUMBNAIL_KEY },
        select: { value: true },
      });

      if (oldSetting) {
        const normalized = normalizeStoredThumbnailValue(oldSetting.value);
        if (normalized) {
          await writeStoredPool([normalized]);
          await prisma.siteSetting.deleteMany({ where: { key: DEFAULT_THUMBNAIL_KEY } });
          stored = [normalized];
        }
      }
    }

    if (!stored || stored.length === 0) {
      return [];
    }

    // Resolve each stored value to an absolute URL, filtering out invalid ones
    return stored
      .map((v) => resolveThumbnailValue(v))
      .filter((v): v is string => v !== null);
  } catch (error) {
    if (!isSiteSettingsSchemaMissingError(error)) {
      console.error("Failed to load default thumbnail pool", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
    return [];
  }
});

export async function addToDefaultThumbnailPool(url: string): Promise<string[]> {
  if (!(await ensureSiteSettingsSchema())) {
    return [];
  }

  const normalized = normalizeStoredThumbnailValue(url);
  if (!normalized) {
    return [];
  }

  try {
    const current = (await readStoredPool()) ?? [];

    // Deduplicate by comparing normalized stored values
    const isDuplicate = current.some(
      (v) => normalizeStoredThumbnailValue(v) === normalized
    );

    if (!isDuplicate) {
      await writeStoredPool([...current, normalized]);
    }

    const updated = (await readStoredPool()) ?? [];
    return updated
      .map((v) => resolveThumbnailValue(v))
      .filter((v): v is string => v !== null);
  } catch (error) {
    console.error("Failed to add to default thumbnail pool", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return [];
  }
}

export async function removeFromDefaultThumbnailPool(url: string): Promise<string[]> {
  if (!(await ensureSiteSettingsSchema())) {
    return [];
  }

  const normalized = normalizeStoredThumbnailValue(url);

  try {
    const current = (await readStoredPool()) ?? [];
    const filtered = current.filter(
      (v) => normalizeStoredThumbnailValue(v) !== normalized
    );
    await writeStoredPool(filtered);

    return filtered
      .map((v) => resolveThumbnailValue(v))
      .filter((v): v is string => v !== null);
  } catch (error) {
    console.error("Failed to remove from default thumbnail pool", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return [];
  }
}

export async function setDefaultThumbnailPool(urls: string[]): Promise<string[]> {
  if (!(await ensureSiteSettingsSchema())) {
    return [];
  }

  const normalized = urls
    .map((v) => normalizeStoredThumbnailValue(v))
    .filter((v): v is string => v !== null);

  try {
    await writeStoredPool(normalized);

    return normalized
      .map((v) => resolveThumbnailValue(v))
      .filter((v): v is string => v !== null);
  } catch (error) {
    console.error("Failed to set default thumbnail pool", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return [];
  }
}

export async function clearDefaultThumbnailPool(): Promise<void> {
  if (!(await ensureSiteSettingsSchema())) {
    return;
  }

  try {
    await prisma.siteSetting.deleteMany({
      where: { key: { in: [POOL_KEY, SEQUENTIAL_INDEX_KEY] } },
    });
  } catch (error) {
    if (!isSiteSettingsSchemaMissingError(error)) {
      console.error("Failed to clear default thumbnail pool", {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Selection mode
// ---------------------------------------------------------------------------

export const getDefaultThumbnailSelectionMode = cache(
  async (): Promise<"random" | "sequential"> => {
    if (!(await ensureSiteSettingsSchema())) {
      return "random";
    }

    try {
      const setting = await prisma.siteSetting.findUnique({
        where: { key: SELECTION_MODE_KEY },
        select: { value: true },
      });

      if (setting?.value === "sequential") return "sequential";
      return "random";
    } catch (error) {
      if (!isSiteSettingsSchemaMissingError(error)) {
        console.error("Failed to load thumbnail selection mode", {
          error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        });
      }
      return "random";
    }
  }
);

export async function setDefaultThumbnailSelectionMode(
  mode: "random" | "sequential"
): Promise<void> {
  if (!(await ensureSiteSettingsSchema())) {
    return;
  }

  try {
    await prisma.siteSetting.upsert({
      where: { key: SELECTION_MODE_KEY },
      create: { key: SELECTION_MODE_KEY, value: mode },
      update: { value: mode },
    });
  } catch (error) {
    console.error("Failed to set thumbnail selection mode", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
  }
}

// ---------------------------------------------------------------------------
// Pool picker — NOT cached; has side effects (sequential index increment)
// ---------------------------------------------------------------------------

export async function pickDefaultThumbnailUrl(): Promise<string | null> {
  const pool = await getDefaultThumbnailPool();

  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  const mode = await getDefaultThumbnailSelectionMode();

  if (mode === "random") {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Sequential mode: read, pick, then increment
  try {
    const indexSetting = await prisma.siteSetting.findUnique({
      where: { key: SEQUENTIAL_INDEX_KEY },
      select: { value: true },
    });

    const currentIndex = indexSetting ? parseInt(indexSetting.value, 10) || 0 : 0;
    const picked = pool[currentIndex % pool.length];
    const nextIndex = (currentIndex + 1) % pool.length;

    await prisma.siteSetting.upsert({
      where: { key: SEQUENTIAL_INDEX_KEY },
      create: { key: SEQUENTIAL_INDEX_KEY, value: String(nextIndex) },
      update: { value: String(nextIndex) },
    });

    return picked;
  } catch (error) {
    console.error("Failed during sequential thumbnail pick", {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    // Fall back to first item to avoid returning null when pool is non-empty
    return pool[0];
  }
}