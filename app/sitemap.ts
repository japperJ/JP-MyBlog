import { headers } from "next/headers";
import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getPreferredAppOrigin } from "@/lib/runtime-config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories, requestHeaders] = await Promise.all([
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
    headers(),
  ]);

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
