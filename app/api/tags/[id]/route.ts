import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
});

// PATCH /api/tags/[id] - Update tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = tagSchema.parse(body);

    // If name changed, regenerate slug
    const updateData: any = { ...data };
    if (data.name && !data.slug) {
      updateData.slug = slugify(data.name);
    }

    const tag = await prisma.tag.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error updating tag:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/[id] - Delete tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tag.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
