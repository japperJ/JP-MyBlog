import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { calculateReadingTime } from "@/lib/markdown";
import { z } from "zod";

const updatePostSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  excerpt: z.string().optional(),
  coverImage: z
    .string()
    .refine(
      (v) => !v || v.startsWith("/uploads/") || v.startsWith("https://"),
      "coverImage must be a relative /uploads/ path or an https:// URL"
    )
    .optional(),
  published: z.boolean().optional(),
  featured: z.boolean().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

type Params = {
  params: Promise<{
    id: string;
  }>;
};

// GET /api/posts/[id] - Get single post
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const post = await prisma.post.findUnique({
      where: { id },
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

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
      { status: 500 }
    );
  }
}

// PATCH /api/posts/[id] - Update post
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAuth();

    const { id } = await params;
    const body = await request.json();
    const data = updatePostSchema.parse(body);

    const existingPost = await prisma.post.findUnique({
      where: { id },
    });

    if (!existingPost) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    const updates: any = {};

    if (data.title) {
      updates.title = data.title;
      updates.slug = slugify(data.title);
    }

    if (data.content) {
      updates.content = data.content;
      updates.readingTime = calculateReadingTime(data.content);
    }

    if (data.excerpt !== undefined) updates.excerpt = data.excerpt;
    if (data.coverImage !== undefined) updates.coverImage = data.coverImage;
    if (data.featured !== undefined) updates.featured = data.featured;
    
    if (data.published !== undefined) {
      updates.published = data.published;
      if (data.published && !existingPost.publishedAt) {
        updates.publishedAt = new Date();
      }
    }

    // Handle categories and tags
    if (data.categoryIds) {
      await prisma.postCategory.deleteMany({
        where: { postId: id },
      });
    }

    if (data.tagIds) {
      await prisma.postTag.deleteMany({
        where: { postId: id },
      });
    }

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...updates,
        categories: data.categoryIds
          ? {
              create: data.categoryIds.map((categoryId) => ({
                categoryId,
              })),
            }
          : undefined,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        author: true,
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

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating post:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update post" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireAuth();

    const { id } = await params;

    await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
