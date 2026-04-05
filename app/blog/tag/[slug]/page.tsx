import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { PostCard } from "@/components/blog/post-card";
import { Breadcrumbs } from "@/components/blog/breadcrumbs";
import { notFound } from "next/navigation";
import { getAppUrl } from "@/lib/runtime-config";

/** Allow on-demand rendering for tags created after the build. */
export const dynamicParams = true;

/** Re-validate so newly published posts with each tag appear. */
export const revalidate = 60;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: { name: true },
  });

  if (!tag) {
    return { title: "Tag Not Found" };
  }

  const title = `Posts tagged "${tag.name}"`;
  const description = `All posts tagged with ${tag.name}`;
  const canonicalUrl = getAppUrl(`/blog/tag/${slug}`);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      url: canonicalUrl,
      title: `${title} | AICodingBlog`,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: `${title} | AICodingBlog`,
      description,
    },
  };
}

export async function generateStaticParams() {
  try {
    const tags = await prisma.tag.findMany({
      select: { slug: true },
    });

    return tags.map((tag) => ({
      slug: tag.slug,
    }));
  } catch (error) {
    console.error("generateStaticParams failed for /blog/tag/[slug]; falling back to on-demand rendering", {
      route: "/blog/tag/[slug]",
      error: error instanceof Error ? { message: error.message } : error,
    });
    return [];
  }
}

export default async function TagPage({ params }: Props) {
  const { slug } = await params;

  const tag = await prisma.tag.findUnique({
    where: { slug },
  });

  if (!tag) {
    notFound();
  }

  const [posts] = await Promise.all([
    prisma.post.findMany({
    where: {
      published: true,
      tags: {
        some: {
          tag: {
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
    }),
  ]);

  return (
    <>
      <Navigation />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: `#${tag.name}` },
            ]}
          />

          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">#{tag.name}</h1>
            <p className="text-sm text-muted-foreground mt-4">
              {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">
                No posts with this tag yet.
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
