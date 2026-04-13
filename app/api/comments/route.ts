import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { revalidatePath } from "next/cache";

const createCommentSchema = z.object({
  postId: z.string().min(1),
  authorName: z.string().min(1).max(100),
  authorEmail: z.string().email().max(254).optional().or(z.literal("")),
  content: z.string().min(1).max(2000),
  // Honeypot — must be empty. Bots typically fill every field.
  website: z.string().max(0, "Honeypot triggered").optional(),
});

export async function GET(request: NextRequest) {
  try {
    const postId = request.nextUrl.searchParams.get("postId");
    const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, status: "approved" },
        select: {
          id: true,
          authorName: true,
          content: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where: { postId, status: "approved" } }),
    ]);

    return NextResponse.json({
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comments", {
      route: "/api/comments",
      error: error instanceof Error ? { message: error.message } : error,
    });
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { allowed, retryAfterMs } = rateLimit(`comment:${ip}`, {
      limit: 3,
      windowMs: 10 * 60 * 1000,
    });

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many comments. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) },
        }
      );
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { postId, authorName, authorEmail, content, website } = parsed.data;

    // Honeypot: silently accept but do not persist
    if (website) {
      return NextResponse.json({ success: true });
    }

    // Verify the target post exists and is published
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { published: true },
    });

    if (!post || !post.published) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.comment.create({
      data: {
        postId,
        authorName: authorName.trim(),
        authorEmail: authorEmail?.trim() || null,
        content: content.trim(),
        status: "pending",
      },
    });

    revalidatePath(`/blog`);

    return NextResponse.json(
      { success: true, message: "Your comment has been submitted and is awaiting approval." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating comment", {
      route: "/api/comments",
      error: error instanceof Error ? { message: error.message } : error,
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to save comment" }, { status: 500 });
  }
}
