import { existsSync } from "fs";
import { readdir, stat } from "fs/promises";
import path from "path";
import Link from "next/link";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { MediaLibraryClient } from "@/components/admin/media-library-client";
import { getDefaultThumbnailUrl } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

async function getExistingUploads() {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!existsSync(uploadsDir)) return [];
  const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
  try {
    const entries = await readdir(uploadsDir);
    const images = await Promise.all(
      entries
        .filter((name) => IMAGE_EXTS.has(path.extname(name).toLowerCase()))
        .map(async (name) => {
          const filePath = path.join(uploadsDir, name);
          const info = await stat(filePath);
          return {
            url: `/uploads/${name}`,
            filename: name,
            size: info.size,
            uploadedAt: info.mtime.toISOString(),
          };
        })
    );
    return images.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } catch {
    return [];
  }
}

export default async function MediaLibraryPage() {
  const [defaultThumbnailUrl, existingImages] = await Promise.all([
    getDefaultThumbnailUrl(),
    getExistingUploads(),
  ]);

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Media Library</h1>
              <p className="text-muted-foreground">
                Manage local uploads, image URLs, and the blog&apos;s default thumbnail
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin">Back to Dashboard</Link>
            </Button>
          </div>

          <MediaLibraryClient
            initialDefaultThumbnailUrl={defaultThumbnailUrl}
            initialImages={existingImages}
          />
        </div>
      </main>
    </>
  );
}
