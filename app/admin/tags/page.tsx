"use client";

import { useState, useEffect } from "react";
import { Navigation } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count?: {
    posts: number;
  };
}

export default function ManageTagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  });

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId ? `/api/tags/${editingId}` : "/api/tags";
      const method = editingId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save tag");
      }

      setFormData({ name: "", slug: "" });
      setShowForm(false);
      setEditingId(null);
      fetchTags();
    } catch (error) {
      console.error("Error saving tag:", error);
      alert("Failed to save tag. Please try again.");
    }
  };

  const handleEdit = (tag: Tag) => {
    setFormData({
      name: tag.name,
      slug: tag.slug,
    });
    setEditingId(tag.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) {
      return;
    }

    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete tag");
      }

      fetchTags();
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag. Please try again.");
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", slug: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: generateSlug(name),
    });
  };

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Manage Tags</h1>
              <p className="text-muted-foreground">
                Tag your posts for better organization
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/admin">Back to Dashboard</Link>
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showForm ? (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>{editingId ? "Edit Tag" : "Add New Tag"}</CardTitle>
                <CardDescription>
                  {editingId ? "Update tag details" : "Create a new tag for your posts"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      placeholder="e.g., React"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      placeholder="react"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL-friendly version (auto-generated from name)
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingId ? "Update Tag" : "Add Tag"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="mb-8">
              <Button onClick={() => setShowForm(true)}>Add New Tag</Button>
            </div>
          )}

          {/* Tags List */}
          <Card>
            <CardHeader>
              <CardTitle>All Tags</CardTitle>
              <CardDescription>
                {tags.length} {tags.length === 1 ? "tag" : "tags"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8">Loading tags...</p>
              ) : tags.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No tags yet. Create your first tag!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="group flex items-center gap-2 px-4 py-2 border rounded-full hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium">#{tag.name}</span>
                      {tag._count && (
                        <span className="text-xs text-muted-foreground">
                          ({tag._count.posts})
                        </span>
                      )}
                      <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEdit(tag)}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleDelete(tag.id)}
                        >
                          🗑️
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
