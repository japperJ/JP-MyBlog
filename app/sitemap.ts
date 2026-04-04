import { headers } from "next/headers";
import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPreferredAppOrigin } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  let posts: Array<{ slug: string; updatedAt: Date }> = [];
  let categories: Array<{ slug: string; updatedAt: Date }> = [];

  try {
    [posts, categories] = await Promise.all([
      prisma.post.findMany({
        where: { published: true },
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
      prisma.category.findMany({
        select: {
          slug: true,
          updatedAt: true,
        },
      }),
    ]);
  } catch (error) {
    console.error("Sitemap DB query failed; returning base sitemap entries only", {
      route: "/sitemap.xml",
      error: error instanceof Error ? { message: error.message } : error,
    });
  }

  const baseUrl = getPreferredAppOrigin(requestHeaders);

  const postUrls = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const categoryUrls = categories.map((category) => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...postUrls,
    ...categoryUrls,
  ];
}
