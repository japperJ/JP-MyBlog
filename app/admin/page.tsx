import { prisma } from "@/lib/prisma";
import { AdminNavigation } from "@/components/admin-navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FolderOpen, Tag, Eye } from "lucide-react";

export default async function AdminDashboard() {
  const [postCount, categoryCount, tagCount, totalViews] = await Promise.all([
    prisma.post.count(),
    prisma.category.count(),
    prisma.tag.count(),
    prisma.post.aggregate({
      _sum: {
        views: true,
      },
    }),
  ]);

  const recentPosts = await prisma.post.findMany({
    take: 5,
    orderBy: {
      updatedAt: "desc",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      published: true,
      views: true,
      updatedAt: true,
    },
  });

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <Button asChild>
              <Link href="/admin/posts/new">Create New Post</Link>
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{postCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categoryCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tags</CardTitle>
                <Tag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tagCount}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews._sum.views || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Posts */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Posts</CardTitle>
                  <CardDescription>Your latest blog posts</CardDescription>
                </div>
                <Button asChild variant="outline">
                  <Link href="/admin/posts">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{post.title}</h3>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            post.published
                              ? "bg-green-500/10 text-green-500"
                              : "bg-yellow-500/10 text-yellow-500"
                          }`}
                        >
                          {post.published ? "Published" : "Draft"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {post.views} views • Updated {new Date(post.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/posts/${post.id}/edit`}>Edit</Link>
                      </Button>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {recentPosts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No posts yet. Create your first post to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Manage Posts</CardTitle>
                <CardDescription>Create, edit, and organize your content</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/admin/posts">View Posts</Link>
                  </Button>
                  <Button asChild className="flex-1">
                    <Link href="/admin/posts/new">New Post</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize posts by category</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/categories">Manage Categories</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
                <CardDescription>Add and manage post tags</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/tags">Manage Tags</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Media Library</CardTitle>
                <CardDescription>Upload and manage images</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/media">Manage Media</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
