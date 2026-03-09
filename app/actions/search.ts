"use server";

import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  categories: {
    category: {
      name: string;
      slug: string;
    };
  }[];
};

export async function searchPosts(query: string): Promise<SearchResult[]> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return [];
  }

  const posts = await prisma.post.findMany({
    where: {
      published: true,
      OR: [
        { title: { contains: trimmed, mode: "insensitive" } },
        { excerpt: { contains: trimmed, mode: "insensitive" } },
        { content: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      categories: {
        include: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 8,
  });

  return posts;
}
