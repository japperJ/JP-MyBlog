import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PostPageClient from "@/components/blog/post-page-client";
import { prisma } from "@/lib/prisma";
import { getAppUrl, getConfiguredAppOrigin } from "@/lib/runtime-config";

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
  const ogImageUrl = new URL(getAppUrl("/api/og"));
  ogImageUrl.searchParams.set("title", post.title);
  if (post.excerpt) {
    ogImageUrl.searchParams.set("excerpt", post.excerpt);
  }
  if (categoryName) {
    ogImageUrl.searchParams.set("category", categoryName);
  }

  const socialImageUrl = post.coverImage
    ? new URL(post.coverImage, appOrigin).toString()
    : ogImageUrl.toString();
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
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true },
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
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

  return <PostPageClient post={post} />;
}
