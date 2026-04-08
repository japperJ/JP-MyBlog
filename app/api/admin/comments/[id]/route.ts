import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const patchCommentSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Props) {
  try {
    await requireAdmin();

    const { id } = await params;
    const body = await request.json();
    const parsed = patchCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, post: { select: { slug: true } } },
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    });

    // Revalidate the blog post page so approved comments appear immediately
    revalidatePath(`/blog/${comment.post.slug}`);

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating comment status", {
      route: "/api/admin/comments/[id]",
      error: error instanceof Error ? { message: error.message } : error,
    });
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
