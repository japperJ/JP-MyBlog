import Link from "next/link";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { MediaLibraryClient } from "@/components/admin/media-library-client";
import { getDefaultThumbnailUrl } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function MediaLibraryPage() {
  const defaultThumbnailUrl = await getDefaultThumbnailUrl();

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

          <MediaLibraryClient initialDefaultThumbnailUrl={defaultThumbnailUrl} />
        </div>
      </main>
    </>
  );
}
