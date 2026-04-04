import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/blog/post-card";
import { Breadcrumbs } from "@/components/blog/breadcrumbs";
import { notFound } from "next/navigation";
import { getAppUrl } from "@/lib/runtime-config";

/** Allow on-demand rendering for categories created after the build. */
export const dynamicParams = true;

/** Re-validate so newly published posts in each category appear. */
export const revalidate = 60;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true, description: true },
  });

  if (!category) {
    return { title: "Category Not Found" };
  }

  const title = `${category.name} Articles`;
  const description =
    category.description || `Browse all articles in the ${category.name} category`;
  const canonicalUrl = getAppUrl(`/blog/category/${slug}`);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      url: canonicalUrl,
      title: `${title} | AI Coding Blog`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | AI Coding Blog`,
      description,
    },
  };
}

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({
      select: { slug: true },
    });

    return categories.map((category) => ({
      slug: category.slug,
    }));
  } catch (error) {
    console.error(
      "generateStaticParams failed for /blog/category/[slug]; falling back to on-demand rendering",
      {
        route: "/blog/category/[slug]",
        error: error instanceof Error ? { message: error.message } : error,
      }
    );
    return [];
  }
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
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: category.name },
            ]}
          />

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
      <Footer />
    </>
  );
}
