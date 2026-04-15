import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackPostView } from "@/lib/post-views";
import { VISITOR_ID_STORAGE_KEY } from "@/lib/visitor-constants";
import { getSession } from "@/lib/auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const post = await prisma.post.findUnique({
      where: { id },
      select: { id: true, published: true },
    });

    if (!post || !post.published) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const session = await getSession();
    const { counted } = await trackPostView({
      postId: post.id,
      userId: session?.user.id,
      visitorId: request.cookies.get(VISITOR_ID_STORAGE_KEY)?.value ?? null,
      headers: request.headers,
    });

    return NextResponse.json({ counted });
  } catch (error) {
    console.error("Error tracking post view", {
      route: "/api/posts/[id]/view",
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });
    return NextResponse.json({ error: "Failed to track post view" }, { status: 500 });
  }
}
