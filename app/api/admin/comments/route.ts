import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { CommentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as CommentStatus | null;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        select: {
          id: true,
          authorName: true,
          authorEmail: true,
          content: true,
          status: true,
          createdAt: true,
          post: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.comment.count({ where }),
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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching admin comments", {
      route: "/api/admin/comments",
      error: error instanceof Error ? { message: error.message } : error,
    });
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}
