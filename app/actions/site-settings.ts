"use server";

import { getSession } from "@/lib/auth";
import {
  clearDefaultThumbnailSetting,
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