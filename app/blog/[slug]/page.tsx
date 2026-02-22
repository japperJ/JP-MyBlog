import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import PostPageClient from "@/components/blog/post-page-client";
import type { Metadata } from "next";

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

  const categoryName = post.categories[0]?.category.name;
  
  // Generate OG image URL
  const ogImageUrl = new URL('/api/og', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001');
  ogImageUrl.searchParams.set('title', post.title);
  if (post.excerpt) {
    ogImageUrl.searchParams.set('excerpt', post.excerpt);
  }
  if (categoryName) {
    ogImageUrl.searchParams.set('category', categoryName);
  }

  return {
    title: post.title,
    description: post.excerpt || undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      images: [
        {
          url: post.coverImage || ogImageUrl.toString(),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt || undefined,
      images: [post.coverImage || ogImageUrl.toString()],
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

  // Increment view count (this will run on server)
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
