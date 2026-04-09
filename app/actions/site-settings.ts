"use server";

import { getSession } from "@/lib/auth";
import {
  addToDefaultThumbnailPool,
  clearDefaultThumbnailPool,
  clearDefaultThumbnailSetting,
  removeFromDefaultThumbnailPool,
  setDefaultThumbnailSelectionMode,
  setDefaultThumbnailSetting,
} from "@/lib/site-settings";

async function requireAdminSession() {
  const session = await getSession();

  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function updateDefaultThumbnailAction(url: string): Promise<string> {
  await requireAdminSession();

  const savedUrl = await setDefaultThumbnailSetting(url);

  if (!savedUrl) {
    throw new Error("Invalid thumbnail URL");
  }

  return savedUrl;
}

export async function clearDefaultThumbnailAction(): Promise<void> {
  await requireAdminSession();
  await clearDefaultThumbnailSetting();
}

export async function addToDefaultThumbnailPoolAction(url: string): Promise<string[]> {
  await requireAdminSession();

  const pool = await addToDefaultThumbnailPool(url);

  if (pool.length === 0) {
    throw new Error("Invalid thumbnail URL or failed to add to pool");
  }

  return pool;
}

export async function removeFromDefaultThumbnailPoolAction(url: string): Promise<string[]> {
  await requireAdminSession();
  return removeFromDefaultThumbnailPool(url);
}

export async function setDefaultThumbnailSelectionModeAction(
  mode: "random" | "sequential"
): Promise<void> {
  await requireAdminSession();
  await setDefaultThumbnailSelectionMode(mode);
}

export async function clearDefaultThumbnailPoolAction(): Promise<void> {
  await requireAdminSession();
  await clearDefaultThumbnailPool();
}