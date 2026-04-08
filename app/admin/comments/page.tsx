import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminCommentsClient } from "./comments-client";

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export const metadata = {
  title: "Kommentarer | Admin",
};

export default async function AdminCommentsPage({ searchParams }: Props) {
  await requireAdmin();

  const { status = "pending", page = "1" } = await searchParams;
  const pageSize = 20;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const skip = (pageNum - 1) * pageSize;

  const filterStatus =
    status === "approved" || status === "rejected" || status === "pending"
      ? (status as "approved" | "rejected" | "pending")
      : "pending";

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { status: filterStatus },
      include: {
        post: { select: { title: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.comment.count({ where: { status: filterStatus } }),
  ]);

  const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.comment.count({ where: { status: "pending" } }),
    prisma.comment.count({ where: { status: "approved" } }),
    prisma.comment.count({ where: { status: "rejected" } }),
  ]);

  return (
    <AdminCommentsClient
      comments={comments}
      total={total}
      pageSize={pageSize}
      currentPage={pageNum}
      currentStatus={filterStatus}
      counts={{ pending: pendingCount, approved: approvedCount, rejected: rejectedCount }}
    />
  );
}
