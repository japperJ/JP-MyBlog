"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Image as ImageIcon, Info, PlusCircle, Shuffle, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  addToDefaultThumbnailPoolAction,
  clearDefaultThumbnailPoolAction,
  removeFromDefaultThumbnailPoolAction,
  setDefaultThumbnailSelectionModeAction,
} from "@/app/actions/site-settings";
import { deleteUploadedImageAction } from "@/app/actions/upload";

// Normalize to pathname+search so relative and absolute forms of the same URL compare equal.
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url, "http://x");
    return u.pathname + (u.search || "");
  } catch {
    return url;
  }
}

interface UploadedImage {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface MediaLibraryClientProps {
  initialDefaultThumbnailPool: string[];
  initialSelectionMode: "random" | "sequential";
  initialImages?: UploadedImage[];
}

export function MediaLibraryClient({
  initialDefaultThumbnailPool,
  initialSelectionMode,
  initialImages = [],
}: MediaLibraryClientProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [thumbnailPool, setThumbnailPool] = useState<string[]>(initialDefaultThumbnailPool);
  const [selectionMode, setSelectionMode] = useState<"random" | "sequential">(initialSelectionMode);
  const [poolActionInFlight, setPoolActionInFlight] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [addingExternal, setAddingExternal] = useState(false);
  const [clearingPool, setClearingPool] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  useEffect(() => { setImages(initialImages); }, [initialImages]);
  useEffect(() => { setThumbnailPool(initialDefaultThumbnailPool); }, [initialDefaultThumbnailPool]);
  useEffect(() => { setSelectionMode(initialSelectionMode); }, [initialSelectionMode]);

  const isInPool = (url: string) =>
    thumbnailPool.some((p) => normalizeUrl(p) === normalizeUrl(url));

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({ error: "Upload failed" }));
      if (!response.ok) throw new Error(data.error || "Upload failed");

      if (typeof data?.url !== "string" || !data.url) {
        throw new Error("Upload did not return a file URL.");
      }

      const absoluteUrl = new URL(data.url, window.location.origin).toString();
      const newImage: UploadedImage = {
        url: absoluteUrl,
        filename: files[0].name,
        size: files[0].size,
        uploadedAt: new Date().toISOString(),
      };

      setImages((current) => [newImage, ...current]);
      router.refresh();
      alert(`Image uploaded successfully!\nURL: ${absoluteUrl}`);
    } catch (error) {
      console.error("Error uploading file", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy image URL", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const togglePoolMembership = async (url: string) => {
    setPoolActionInFlight(url);
    try {
      if (isInPool(url)) {
        const updated = await removeFromDefaultThumbnailPoolAction(url);
        setThumbnailPool(updated);
      } else {
        const updated = await addToDefaultThumbnailPoolAction(url);
        setThumbnailPool(updated);
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to update thumbnail pool", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to update thumbnail pool.");
    } finally {
      setPoolActionInFlight(null);
    }
  };

  const removeFromPool = async (url: string) => {
    setPoolActionInFlight(url);
    try {
      const updated = await removeFromDefaultThumbnailPoolAction(url);
      setThumbnailPool(updated);
      router.refresh();
    } catch (error) {
      console.error("Failed to remove from thumbnail pool", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to remove from pool.");
    } finally {
      setPoolActionInFlight(null);
    }
  };

  const handleAddExternal = async () => {
    if (!externalUrl.trim()) return;
    setAddingExternal(true);
    try {
      const updated = await addToDefaultThumbnailPoolAction(externalUrl.trim());
      setThumbnailPool(updated);
      setExternalUrl("");
      router.refresh();
    } catch (error) {
      console.error("Failed to add external URL to pool", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to add URL to pool.");
    } finally {
      setAddingExternal(false);
    }
  };

  const handleClearPool = async () => {
    if (!confirm("Remove all images from the thumbnail pool? This cannot be undone.")) return;
    setClearingPool(true);
    try {
      await clearDefaultThumbnailPoolAction();
      setThumbnailPool([]);
      router.refresh();
    } catch (error) {
      console.error("Failed to clear thumbnail pool", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to clear pool.");
    } finally {
      setClearingPool(false);
    }
  };

  const handleSelectionMode = async (mode: "random" | "sequential") => {
    if (mode === selectionMode) return;
    try {
      await setDefaultThumbnailSelectionModeAction(mode);
      setSelectionMode(mode);
      router.refresh();
    } catch (error) {
      console.error("Failed to set selection mode", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to update selection mode.");
    }
  };

  const deleteImage = async (url: string) => {
    if (!confirm("Delete this image? This cannot be undone.")) return;

    setDeletingImage(url);
    try {
      // Remove from pool first if present, so pool stays clean
      if (isInPool(url)) {
        const updated = await removeFromDefaultThumbnailPoolAction(url);
        setThumbnailPool(updated);
      }
      await deleteUploadedImageAction(url);
      setImages((current) => current.filter((img) => img.url !== url));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete image.");
    } finally {
      setDeletingImage(null);
    }
  };

  return (
    <>
      <Card className="mb-8 border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Hosted upload limitation
          </CardTitle>
          <CardDescription>
            Vercel-hosted preview and development deployments do not support persistent filesystem uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Use an external HTTPS image URL in your post&apos;s cover image field when you are working on Vercel.
          </p>
          <p>
            Local filesystem uploads remain available only for local or non-Vercel workflows until object storage is added.
          </p>
        </CardContent>
      </Card>

      {/* Default thumbnail pool */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Default thumbnail pool
          </CardTitle>
          <CardDescription>
            Add images to the pool. When a post has no cover image, one is picked automatically — randomly or in order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pool grid */}
          {thumbnailPool.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No images in the pool yet. Click &quot;Add to pool&quot; on any uploaded image below, or enter an external URL.
            </p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {thumbnailPool.map((url) => (
                <div key={url} className="relative border rounded-lg overflow-hidden w-40">
                  <img
                    src={url}
                    alt="Pool thumbnail"
                    className="h-24 w-40 object-cover"
                  />
                  <div className="p-2 space-y-1">
                    <p
                      className="text-xs text-muted-foreground truncate"
                      title={url}
                    >
                      {url}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => removeFromPool(url)}
                      disabled={poolActionInFlight === url}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {poolActionInFlight === url ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selection mode toggle */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Selection mode</p>
            <div className="flex gap-2">
              <Button
                variant={selectionMode === "random" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelectionMode("random")}
              >
                Random
              </Button>
              <Button
                variant={selectionMode === "sequential" ? "default" : "outline"}
                size="sm"
                onClick={() => handleSelectionMode("sequential")}
              >
                In order
              </Button>
            </div>
          </div>

          {/* Add external URL */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Add external URL</p>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://..."
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddExternal(); }}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleAddExternal}
                disabled={addingExternal || !externalUrl.trim()}
              >
                <PlusCircle className="h-4 w-4 mr-1" />
                {addingExternal ? "Adding…" : "Add to pool"}
              </Button>
            </div>
          </div>

          {/* Clear all */}
          {thumbnailPool.length > 0 && (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleClearPool}
              disabled={clearingPool}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {clearingPool ? "Clearing…" : "Clear all"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Upload */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Image</CardTitle>
          <CardDescription>
            Local-only workflow. Hosted Vercel uploads return a clear error and should be replaced with manual HTTPS URLs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label
                htmlFor="file-upload"
                className="flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Upload className="h-6 w-6" />
                <span className="text-lg">{uploading ? "Uploading..." : "Click to upload or drag and drop"}</span>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Max file size: 5MB</p>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                  1
                </span>
                Choose an image source
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                Upload locally when you are not on Vercel, or prepare an external HTTPS image URL for hosted environments.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                  2
                </span>
                Build the thumbnail pool
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                Click &quot;Add to pool&quot; on any uploaded image below, or paste an external URL into the pool card above.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                  3
                </span>
                Keep editing posts as normal
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                The blog will automatically pick a thumbnail from the pool whenever a post does not have its own cover image.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uploaded images grid */}
      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Images</CardTitle>
            <CardDescription>Images in the uploads folder. Click &quot;Add to pool&quot; to include an image in the default thumbnail pool.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => {
                const inPool = isInPool(image.url);
                const actionInFlight = poolActionInFlight === image.url;

                return (
                  <div
                    key={`${image.url}-${image.uploadedAt}`}
                    className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-video bg-muted flex items-center justify-center relative group">
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement
                            ?.querySelector(".fallback-icon")
                            ?.classList.remove("hidden");
                        }}
                      />
                      <ImageIcon className="h-12 w-12 text-muted-foreground fallback-icon hidden" />
                    </div>
                    <div className="p-3 space-y-2">
                      <div className="text-sm font-medium truncate" title={image.filename}>
                        {image.filename}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(image.size)}</span>
                        <span>{new Date(image.uploadedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => copyToClipboard(image.url)}
                        >
                          {copiedUrl === image.url ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy URL
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={image.url} target="_blank" rel="noopener noreferrer">
                            View
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteImage(image.url)}
                          disabled={deletingImage === image.url}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {deletingImage === image.url ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                      <Button
                        variant={inPool ? "secondary" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => togglePoolMembership(image.url)}
                        disabled={actionInFlight}
                      >
                        {inPool ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            {actionInFlight ? "Removing…" : "In pool ✓"}
                          </>
                        ) : (
                          <>
                            <PlusCircle className="h-3 w-3 mr-1" />
                            {actionInFlight ? "Adding…" : "Add to pool"}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {images.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No images found in the uploads folder yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
