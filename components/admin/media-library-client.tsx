"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Image as ImageIcon, Info, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearDefaultThumbnailAction,
  updateDefaultThumbnailAction,
} from "@/app/actions/site-settings";

interface UploadedImage {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

interface MediaLibraryClientProps {
  initialDefaultThumbnailUrl: string | null;
}

export function MediaLibraryClient({ initialDefaultThumbnailUrl }: MediaLibraryClientProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [defaultThumbnailUrl, setDefaultThumbnailUrl] = useState<string | null>(
    initialDefaultThumbnailUrl
  );
  const [savingDefaultThumbnail, setSavingDefaultThumbnail] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({ error: "Upload failed" }));
      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

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

      setImages((currentImages) => [newImage, ...currentImages]);
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

  const setAsDefaultThumbnail = async (url: string) => {
    setSavingDefaultThumbnail(url);

    try {
      const savedUrl = await updateDefaultThumbnailAction(url);
      setDefaultThumbnailUrl(savedUrl);
      router.refresh();
      alert("Default thumbnail image updated.");
    } catch (error) {
      console.error("Failed to set default thumbnail", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to update default thumbnail.");
    } finally {
      setSavingDefaultThumbnail(null);
    }
  };

  const clearDefaultThumbnail = async () => {
    setSavingDefaultThumbnail("clear");

    try {
      await clearDefaultThumbnailAction();
      setDefaultThumbnailUrl(null);
      router.refresh();
      alert("Default thumbnail image cleared.");
    } catch (error) {
      console.error("Failed to clear default thumbnail", {
        page: "/admin/media",
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      });
      alert(error instanceof Error ? error.message : "Failed to clear default thumbnail.");
    } finally {
      setSavingDefaultThumbnail(null);
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

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Default thumbnail image</CardTitle>
          <CardDescription>
            Choose one image to use when a blog post does not have its own cover image.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {defaultThumbnailUrl ? (
            <div className="space-y-3">
              <div className="flex items-start gap-4 rounded-lg border p-4">
                <img
                  src={defaultThumbnailUrl}
                  alt="Current default thumbnail"
                  className="h-24 w-40 rounded-md object-cover border"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Current default thumbnail</p>
                  <p className="text-sm text-muted-foreground break-all">{defaultThumbnailUrl}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearDefaultThumbnail}
                disabled={savingDefaultThumbnail === "clear"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {savingDefaultThumbnail === "clear" ? "Clearing..." : "Clear default thumbnail"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No default thumbnail is set yet. Posts without a cover image will use the generated blog image fallback.
            </p>
          )}
        </CardContent>
      </Card>

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
                Set the default thumbnail
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                Use the button on an image card below to mark it as the fallback thumbnail for posts without cover images.
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
                The blog will automatically use the saved default thumbnail whenever a post does not have its own cover image.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Uploaded</CardTitle>
            <CardDescription>Images uploaded in this browser session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => {
                const isCurrentDefault = defaultThumbnailUrl === image.url;

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
                        onError={(error) => {
                          error.currentTarget.style.display = "none";
                          error.currentTarget.parentElement
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
                      </div>
                      <Button
                        variant={isCurrentDefault ? "secondary" : "outline"}
                        size="sm"
                        className="w-full"
                        onClick={() => setAsDefaultThumbnail(image.url)}
                        disabled={savingDefaultThumbnail === image.url || isCurrentDefault}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        {isCurrentDefault
                          ? "Current default thumbnail"
                          : savingDefaultThumbnail === image.url
                            ? "Saving..."
                            : "Set as default thumbnail"}
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
              <p>No images uploaded in this session yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
