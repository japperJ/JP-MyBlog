import type { Metadata } from "next";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/blog/post-card";
import { BlogPagination } from "@/components/blog/pagination";
import { CategoryFilter } from "@/components/blog/category-filter";

/** Re-validate the blog listing so newly published posts appear. */
export const revalidate = 60;

const PAGE_SIZE = 9;

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

type Props = {
  searchParams: Promise<{
    page?: string;
    category?: string;
  }>;
};

export default async function BlogPage({ searchParams }: Props) {
  const { page: pageParam, category } = await searchParams;
  const requestedPage = Math.max(1, parseInt(pageParam || "1", 10));

  // Build where clause — always require published, optionally filter by category
  const where: Prisma.PostWhereInput = { published: true };
  if (category) {
    where.categories = {
      some: { category: { slug: category } },
    };
  }

  // Run post query, count, and category list in parallel
  const [posts, totalPosts, categories] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { name: true } },
        categories: { include: { category: true } },
      },
      orderBy: { publishedAt: "desc" },
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.post.count({ where }),
    // Only fetch categories that have at least one published post
    prisma.category.findMany({
      where: { posts: { some: { post: { published: true } } } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);
  // Clamp page to valid range (e.g. /blog?page=999 → last page)
  const currentPage =
    totalPages > 0 ? Math.min(requestedPage, totalPages) : 1;

  // Build search params to preserve category across pagination links
  const paginationParams: Record<string, string> = {};
  if (category) {
    paginationParams.category = category;
  }

  const isFiltered = !!category;

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

          <CategoryFilter
            categories={categories}
            activeCategory={category}
          />

          {posts.length === 0 ? (
            <div className="text-center py-20">
              {isFiltered ? (
                <>
                  <p className="text-muted-foreground text-lg mb-4">
                    No posts found in this category.
                  </p>
                  <Link
                    href="/blog"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    View all posts
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground text-lg">
                  No posts published yet. Check back soon!
                </p>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          <BlogPagination
            currentPage={currentPage}
            totalPages={totalPages}
            searchParams={paginationParams}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
