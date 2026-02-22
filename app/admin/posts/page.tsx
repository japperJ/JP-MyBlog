import { prisma } from "@/lib/prisma";
import { AdminNavigation } from "@/components/admin-navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminPostsPage() {
  const posts = await prisma.post.findMany({
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      author: {
        select: {
          name: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  return (
    <>
      <AdminNavigation />
      <main className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Manage Posts</h1>
            <Button asChild>
              <Link href="/admin/posts/new">Create New Post</Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.map((post) => (
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
                        {post.featured && (
                          <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                            Featured
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>{post.views} views</span>
                        <span>{post.readingTime} min read</span>
                        <span>Updated {new Date(post.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {post.categories.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {post.categories.map(({ category }) => (
                            <span
                              key={category.id}
                              className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded"
                            >
                              {category.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/posts/${post.id}/edit`}>Edit</Link>
                      </Button>
                      {post.published && (
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            View
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No posts yet. Create your first post to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
