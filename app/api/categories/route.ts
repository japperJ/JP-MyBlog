import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

// GET /api/categories - List all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
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

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = categorySchema.parse(body);

    const slug = slugify(data.name);

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
