import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// PATCH /api/categories/[id] - Update category
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();
    const body = await request.json();
    const data = categorySchema.parse(body);

    // If name changed, regenerate slug
    const updateData: any = { ...data };
    if (data.name && !data.slug) {
      updateData.slug = slugify(data.name);
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error updating category:", error);
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
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth();

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
