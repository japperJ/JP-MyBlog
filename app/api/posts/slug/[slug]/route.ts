import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

// GET /api/posts/slug/[slug] - Get post by slug
export async function GET(request: NextRequest, { params }: Params) {
  try {
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

    if (!post) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    // Increment view count
    await prisma.post.update({
      where: { id: post.id },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}
