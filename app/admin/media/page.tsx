"use client";

import { useState } from "react";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Upload, Copy, Check, Image as ImageIcon } from "lucide-react";

interface UploadedImage {
  url: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

export default function MediaLibraryPage() {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", files[0]);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      
      // Add to images list
      const newImage: UploadedImage = {
        url: data.url,
        filename: files[0].name,
        size: files[0].size,
        uploadedAt: new Date().toISOString(),
      };

      setImages([newImage, ...images]);
      
      // Show success message
      alert(`Image uploaded successfully!\nURL: ${data.url}`);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Media Library</h1>
              <p className="text-muted-foreground">
                Upload and manage your blog images
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin">Back to Dashboard</Link>
            </Button>
          </div>

          {/* Upload Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Upload Image</CardTitle>
              <CardDescription>
                Upload images for your blog posts. Supported formats: JPG, PNG, GIF, WebP
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
                    <span className="text-lg">
                      {uploading ? "Uploading..." : "Click to upload or drag and drop"}
                    </span>
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
              <p className="text-xs text-muted-foreground mt-2">
                Max file size: 5MB
              </p>
            </CardContent>
          </Card>

          {/* Instructions */}
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
                    Upload Image
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    Click the upload area or drag and drop your image file
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                      2
                    </span>
                    Copy URL
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    Click the copy button to get the image URL
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">
                      3
                    </span>
                    Use in Post
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    Paste the URL in your post's cover image field
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recently Uploaded Images */}
          {images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recently Uploaded</CardTitle>
                <CardDescription>Images uploaded in this session</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-video bg-muted flex items-center justify-center relative group">
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback if image fails to load
                            e.currentTarget.style.display = "none";
                            e.currentTarget.parentElement!.querySelector(".fallback-icon")!.classList.remove("hidden");
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
                        <div className="flex gap-2">
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
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={image.url} target="_blank" rel="noopener noreferrer">
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {images.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No images uploaded yet. Upload your first image above!</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
