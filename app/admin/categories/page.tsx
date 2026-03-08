"use client";

import { useState, useEffect } from "react";
import { AdminNavigation } from "@/components/admin-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: {
    posts: number;
  };
}

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const method = editingId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save category");
      }

      setFormData({ name: "", slug: "", description: "" });
      setShowForm(false);
      setEditingId(null);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Failed to save category. Please try again.");
    }
  };

  const handleEdit = (category: Category) => {
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
    });
    setEditingId(category.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete category");
      }

      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category. Please try again.");
    }
  };

  const handleCancel = () => {
    setFormData({ name: "", slug: "", description: "" });
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
      ...formData,
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
              <h1 className="text-4xl font-bold mb-2">Manage Categories</h1>
              <p className="text-muted-foreground">
                Organize your blog posts by category
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
                <CardTitle>{editingId ? "Edit Category" : "Add New Category"}</CardTitle>
                <CardDescription>
                  {editingId ? "Update category details" : "Create a new category for your posts"}
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
                      placeholder="e.g., Artificial Intelligence"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Slug *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      required
                      placeholder="artificial-intelligence"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      URL-friendly version (auto-generated from name)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this category..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingId ? "Update Category" : "Add Category"}
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
              <Button onClick={() => setShowForm(true)}>Add New Category</Button>
            </div>
          )}

          {/* Categories List */}
          <Card>
            <CardHeader>
              <CardTitle>All Categories</CardTitle>
              <CardDescription>
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8">Loading categories...</p>
              ) : categories.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No categories yet. Create your first category!
                </p>
              ) : (
                <div className="space-y-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-lg">{category.name}</h3>
                          <span className="text-xs text-muted-foreground">
                            /{category.slug}
                          </span>
                        </div>
                        {category.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {category.description}
                          </p>
                        )}
                        {category._count && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {category._count.posts} {category._count.posts === 1 ? "post" : "posts"}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id)}
                        >
                          Delete
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
