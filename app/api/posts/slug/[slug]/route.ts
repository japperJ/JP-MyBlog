import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { trackPostView } from "@/lib/post-views";
import { VISITOR_ID_STORAGE_KEY } from "@/lib/visitor-constants";

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

    const session = await getSession();
    await trackPostView({
      postId: post.id,
      userId: session?.user.id,
      visitorId: request.cookies.get(VISITOR_ID_STORAGE_KEY)?.value ?? null,
      headers: request.headers,
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
