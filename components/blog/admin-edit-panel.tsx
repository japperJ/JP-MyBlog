"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Category {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
}

interface AdminEditPanelProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminEditPanel({ postId, open, onOpenChange }: AdminEditPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    coverImage: "",
    published: false,
    featured: false,
    categoryIds: [] as string[],
    tagIds: [] as string[],
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/posts/${postId}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ])
      .then(([post, cats, tgs]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setTags(Array.isArray(tgs) ? tgs : []);
        setFormData({
          title: post.title ?? "",
          excerpt: post.excerpt ?? "",
          content: post.content ?? "",
          coverImage: post.coverImage ?? "",
          published: post.published ?? false,
          featured: post.featured ?? false,
          categoryIds: post.categories?.map((c: { categoryId: string }) => c.categoryId) ?? [],
          tagIds: post.tags?.map((t: { tagId: string }) => t.tagId) ?? [],
        });
      })
      .catch((err) => {
        console.error("Failed to load post for editing", err);
        alert("Failed to load post data.");
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [open, postId, onOpenChange]);

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingCoverImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data?.error === "string" ? data.error : "Upload failed");
      }
      const data = await res.json();
      if (typeof data?.url !== "string") throw new Error("Upload did not return a URL");
      const absoluteUrl = new URL(data.url, window.location.origin).toString();
      setFormData((prev) => ({ ...prev, coverImage: absoluteUrl }));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingCoverImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save post");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete post");
      router.push("/blog");
      onOpenChange(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit Post</SheetTitle>
        </SheetHeader>

        {loading ? (
          <p className="text-muted-foreground">Loading post…</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 pb-12">
            {/* Title */}
            <div>
              <Label htmlFor="ep-title">Title *</Label>
              <Input
                id="ep-title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                required
                placeholder="Post title…"
              />
            </div>

            {/* Excerpt */}
            <div>
              <Label htmlFor="ep-excerpt">Excerpt</Label>
              <Textarea
                id="ep-excerpt"
                value={formData.excerpt}
                onChange={(e) => setFormData((p) => ({ ...p, excerpt: e.target.value }))}
                placeholder="Short description…"
                rows={3}
              />
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="ep-content">Content * (Markdown)</Label>
              <Textarea
                id="ep-content"
                value={formData.content}
                onChange={(e) => setFormData((p) => ({ ...p, content: e.target.value }))}
                required
                placeholder="Write in Markdown…"
                rows={20}
                className="font-mono text-sm"
              />
            </div>

            {/* Cover Image */}
            <div>
              <Label htmlFor="ep-cover">Cover Image URL</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCoverImage}
                  >
                    {uploadingCoverImage ? "Uploading…" : "Upload Image"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCoverImageUpload}
                    aria-label="Upload cover image"
                  />
                </div>
                <Input
                  id="ep-cover"
                  type="url"
                  value={formData.coverImage}
                  onChange={(e) => setFormData((p) => ({ ...p, coverImage: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            {/* Published */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ep-published">Published</Label>
                <p className="text-sm text-muted-foreground">Visible to the public</p>
              </div>
              <Switch
                id="ep-published"
                checked={formData.published}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, published: v }))}
              />
            </div>

            {/* Featured */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ep-featured">Featured</Label>
                <p className="text-sm text-muted-foreground">Show on homepage</p>
              </div>
              <Switch
                id="ep-featured"
                checked={formData.featured}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, featured: v }))}
              />
            </div>

            {/* Categories */}
            {categories.length > 0 && (
              <div>
                <Label>Categories</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {categories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={formData.categoryIds.includes(cat.id)}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            categoryIds: e.target.checked
                              ? [...p.categoryIds, cat.id]
                              : p.categoryIds.filter((id) => id !== cat.id),
                          }))
                        }
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2 px-3 py-1.5 border rounded-full hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={formData.tagIds.includes(tag.id)}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            tagIds: e.target.checked
                              ? [...p.tagIds, tag.id]
                              : p.tagIds.filter((id) => id !== tag.id),
                          }))
                        }
                        className="sr-only"
                      />
                      <span className={formData.tagIds.includes(tag.id) ? "font-medium" : ""}>
                        #{tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t">
              <Button type="submit" disabled={saving || deleting}>
                {saving ? "Saving…" : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving || deleting}
              >
                Cancel
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? "Deleting…" : "Delete Post"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
