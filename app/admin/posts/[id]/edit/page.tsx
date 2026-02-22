"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
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
    async function fetchData() {
      try {
        const [postRes, categoriesRes, tagsRes] = await Promise.all([
          fetch(`/api/posts/${postId}`),
          fetch("/api/categories"),
          fetch("/api/tags"),
        ]);

        if (!postRes.ok) {
          throw new Error("Post not found");
        }

        const post = await postRes.json();
        const categoriesData = await categoriesRes.json();
        const tagsData = await tagsRes.json();

        setCategories(categoriesData);
        setTags(tagsData);
        
        setFormData({
          title: post.title,
          excerpt: post.excerpt || "",
          content: post.content,
          coverImage: post.coverImage || "",
          published: post.published,
          featured: post.featured,
          categoryIds: post.categories?.map((c: any) => c.categoryId) || [],
          tagIds: post.tags?.map((t: any) => t.tagId) || [],
        });
      } catch (error) {
        console.error("Error fetching post:", error);
        alert("Failed to load post");
        router.push("/admin/posts");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [postId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to update post");
      }

      router.push("/admin/posts");
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete post");
      }

      router.push("/admin/posts");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
    }
  };

  if (loading) {
    return (
      <>
        <AdminNavigation />
        <main className="min-h-screen py-12">
          <div className="container mx-auto px-4 max-w-4xl">
            <p>Loading post...</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Edit Post</h1>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Post
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Post Details</CardTitle>
                <CardDescription>Update the information about your blog post</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Enter post title..."
                  />
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Textarea
                    id="excerpt"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    placeholder="Short description of your post..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content * (Markdown supported)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    placeholder="Write your post content in Markdown..."
                    rows={20}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="coverImage">Cover Image URL</Label>
                  <Input
                    id="coverImage"
                    type="url"
                    value={formData.coverImage}
                    onChange={(e) => setFormData({ ...formData, coverImage: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="published">Published</Label>
                    <p className="text-sm text-muted-foreground">
                      Make this post visible to the public
                    </p>
                  </div>
                  <Switch
                    id="published"
                    checked={formData.published}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, published: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="featured">Featured post</Label>
                    <p className="text-sm text-muted-foreground">
                      Show this post on the homepage
                    </p>
                  </div>
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, featured: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Categorize and tag your post</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Categories</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.categoryIds.includes(category.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                categoryIds: [...formData.categoryIds, category.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                categoryIds: formData.categoryIds.filter((id) => id !== category.id),
                              });
                            }
                          }}
                        />
                        <span className="text-sm">{category.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

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
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                tagIds: [...formData.tagIds, tag.id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                tagIds: formData.tagIds.filter((id) => id !== tag.id),
                              });
                            }
                          }}
                          className="sr-only"
                        />
                        <span className={formData.tagIds.includes(tag.id) ? "font-medium" : ""}>
                          #{tag.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/posts")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
