import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /api/tags - List all tags
export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/tags - Create new tag
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const data = tagSchema.parse(body);

    const slug = slugify(data.name);

    const tag = await prisma.tag.create({
      data: {
        name: data.name,
        slug,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
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
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
