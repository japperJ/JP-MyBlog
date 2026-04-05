"use server";

import { unlink } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { isBlobStorageConfigured } from "@/lib/runtime-config";

async function requireAdminSession() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
}

export async function deleteUploadedImageAction(url: string): Promise<void> {
  await requireAdminSession();

  if (isBlobStorageConfigured()) {
    const { del } = await import("@vercel/blob");
    await del(url);
    return;
  }

  // Local filesystem delete
  // url is like /uploads/filename.jpg or http://localhost:3001/uploads/filename.jpg
  let pathname: string;
  try {
    pathname = new URL(url, "http://x").pathname;
  } catch {
    throw new Error("Invalid URL");
  }

  // Only allow deleting from /uploads/
  if (!pathname.startsWith("/uploads/")) {
    throw new Error("Invalid upload path");
  }

  const filename = path.basename(pathname);
  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/")) {
    throw new Error("Invalid filename");
  }

  const filePath = path.join(process.cwd(), "public", "uploads", filename);

  if (!existsSync(filePath)) {
    return; // Already deleted, no-op
  }

  await unlink(filePath);
}
