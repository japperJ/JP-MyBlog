import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/blog/post-card";

/** Re-validate the blog listing so newly published posts appear. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog",
  description: "Discover articles about AI, coding, machine learning, and software development",
  openGraph: {
    title: "Blog | AI Coding Blog",
    description: "Discover articles about AI, coding, machine learning, and software development",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | AI Coding Blog",
    description: "Discover articles about AI, coding, machine learning, and software development",
  },
};

export default async function BlogPage() {
  const posts = await prisma.post.findMany({
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
  });

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">All Posts</h1>
            <p className="text-muted-foreground text-lg">
              Discover articles about AI, coding, and software development
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No posts published yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
