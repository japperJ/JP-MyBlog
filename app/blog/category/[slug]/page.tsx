import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/blog/post-card";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  return categories.map((category) => ({
    slug: category.slug,
  }));
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  
  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      categories: {
        some: {
          category: {
            slug,
          },
        },
      },
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
            <h1 className="text-4xl font-bold mb-4">{category.name}</h1>
            {category.description && (
              <p className="text-muted-foreground text-lg">{category.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-4">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No posts in this category yet.
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
    </>
  );
}
