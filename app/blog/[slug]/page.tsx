import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostPageClient from "@/components/blog/post-page-client";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/blog/breadcrumbs";
import { RelatedPosts } from "@/components/blog/related-posts";
import { PostNavigation } from "@/components/blog/post-navigation";
import { Footer } from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { extractHeadings } from "@/lib/markdown";
import { getAppUrl, getConfiguredAppOrigin } from "@/lib/runtime-config";
import { getPostThumbnailUrl } from "@/lib/post-thumbnail";

/**
 * Allow on-demand rendering for slugs not generated at build time.
 * Without this (or with it set to false), any post created after the
 * Vercel build would 404 because no static page exists for it.
 */
export const dynamicParams = true;

/**
 * Re-validate cached pages every 60 seconds so that edits, new posts,
 * and view-count changes eventually surface without a full redeploy.
 */
export const revalidate = 60;

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      coverImage: true,
      thumbnailUrl: true,
      categories: {
        include: {
          category: true,
        },
      },
    },
  });

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const appOrigin = getConfiguredAppOrigin();
  const categoryName = post.categories[0]?.category.name;

  const socialImageUrl = getPostThumbnailUrl(
    {
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      thumbnailUrl: post.thumbnailUrl,
      category: categoryName,
    },
    appOrigin
  );
  const canonicalUrl = getAppUrl(`/blog/${slug}`);

  return {
    title: post.title,
    description: post.excerpt || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      url: canonicalUrl,
      title: post.title,
      description: post.excerpt || undefined,
      images: [
        {
          url: socialImageUrl,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || undefined,
      images: [socialImageUrl],
    },
  };
}

export async function generateStaticParams() {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      select: { slug: true },
    });

    return posts.map((post) => ({
      slug: post.slug,
    }));
  } catch (error) {
    console.error("generateStaticParams failed for /blog/[slug]; falling back to on-demand rendering", {
      route: "/blog/[slug]",
      error: error instanceof Error ? { message: error.message } : error,
    });
    return [];
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug },
    include: {
      author: {
        select: {
          name: true,
          avatar: true,
          bio: true,
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!post || !post.published) {
    notFound();
  }

  await prisma.post.update({
    where: { id: post.id },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  // Query related posts and prev/next posts in parallel
  const categoryIds = post.categories.map((pc) => pc.category.id);
  const [relatedPosts, prevPost, nextPost] = await Promise.all([
    categoryIds.length > 0
      ? prisma.post.findMany({
          where: {
            published: true,
            id: { not: post.id },
            categories: { some: { categoryId: { in: categoryIds } } },
          },
          select: {
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            thumbnailUrl: true,
            publishedAt: true,
          },
          orderBy: { publishedAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
    // Previous post: published before this one, ordered newest-first
    post.publishedAt
      ? prisma.post.findFirst({
          where: {
            published: true,
            publishedAt: { lt: post.publishedAt },
          },
          orderBy: { publishedAt: "desc" },
          select: { title: true, slug: true },
        })
      : Promise.resolve(null),
    // Next post: published after this one, ordered oldest-first
    post.publishedAt
      ? prisma.post.findFirst({
          where: {
            published: true,
            publishedAt: { gt: post.publishedAt },
          },
          orderBy: { publishedAt: "asc" },
          select: { title: true, slug: true },
        })
      : Promise.resolve(null),
  ]);

  const appOrigin = getConfiguredAppOrigin();
  const postUrl = getAppUrl(`/blog/${slug}`);
  const primaryCategory = post.categories[0]?.category;
  const headings = extractHeadings(post.content);

  const imageUrl = getPostThumbnailUrl(
    {
      title: post.title,
      excerpt: post.excerpt,
      coverImage: post.coverImage,
      thumbnailUrl: post.thumbnailUrl,
      category: primaryCategory?.name,
    },
    appOrigin
  );

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    url: postUrl,
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    ...(imageUrl ? { image: imageUrl } : {}),
    author: {
      "@type": "Person",
      name: post.author.name || "Anonymous",
      ...(post.author.avatar ? { image: post.author.avatar } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "AI Coding Blog",
      url: appOrigin,
    },
  };

  // Build breadcrumb trail: Home > Blog > Category (if any) > Post title
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/" },
    { label: "Blog", href: "/blog" },
  ];
  if (primaryCategory) {
    breadcrumbItems.push({
      label: primaryCategory.name,
      href: `/blog/category/${primaryCategory.slug}`,
    });
  }
  breadcrumbItems.push({ label: post.title });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <PostPageClient
        post={post}
        headings={headings}
        shareUrl={postUrl}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} />}
        postNavigation={
          <PostNavigation prevPost={prevPost} nextPost={nextPost} />
        }
        relatedPosts={<RelatedPosts posts={relatedPosts} />}
      />
      <Footer />
    </>
  );
}
