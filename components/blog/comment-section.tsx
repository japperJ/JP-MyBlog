import { prisma } from "@/lib/prisma";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";

interface CommentSectionProps {
  postId: string;
}

export async function CommentSection({ postId }: CommentSectionProps) {
  const comments = await prisma.comment.findMany({
    where: { postId, status: "approved" },
    select: {
      id: true,
      authorName: true,
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <section className="mt-16 pt-12 border-t" aria-label="Comments">
      <h2 className="text-2xl font-bold mb-8">
        Comments{comments.length > 0 ? ` (${comments.length})` : ""}
      </h2>

      <CommentList comments={comments} />
      <CommentForm postId={postId} />
    </section>
  );
}
