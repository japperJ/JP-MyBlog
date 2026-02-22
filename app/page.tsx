import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/blog/post-card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const [featuredPosts, latestPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        published: true,
        featured: true,
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
      orderBy: {
        publishedAt: "desc",
      },
      take: 3,
    }),
    prisma.post.findMany({
      where: {
        published: true,
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
      orderBy: {
        publishedAt: "desc",
      },
      take: 6,
    }),
  ]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 font-mono">
              AI<span className="text-primary">Coding</span>Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Exploring the intersection of artificial intelligence and software development.
              Learn, build, and innovate with modern tools and techniques.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/blog">
                  Read Articles <ArrowRight className="ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/blog/categories">Browse Categories</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && (
          <section className="py-16 container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8">Featured Articles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </section>
        )}

        {/* Latest Posts */}
        <section className="py-16 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold">Latest Posts</h2>
              <Button asChild variant="ghost">
                <Link href="/blog">View All</Link>
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {latestPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
