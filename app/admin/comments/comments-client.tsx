"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/utils";

type CommentStatus = "pending" | "approved" | "rejected";

interface Comment {
  id: string;
  authorName: string;
  authorEmail: string | null;
  content: string;
  status: CommentStatus;
  createdAt: Date;
  post: { title: string; slug: string };
}

interface Props {
  comments: Comment[];
  total: number;
  pageSize: number;
  currentPage: number;
  currentStatus: CommentStatus;
  counts: { pending: number; approved: number; rejected: number };
}

const STATUS_TABS: { label: string; value: CommentStatus; icon: React.ReactNode }[] = [
  { label: "Afventer", value: "pending", icon: <Clock className="w-4 h-4" /> },
  { label: "Godkendt", value: "approved", icon: <CheckCircle className="w-4 h-4" /> },
  { label: "Afvist", value: "rejected", icon: <XCircle className="w-4 h-4" /> },
];

export function AdminCommentsClient({
  comments,
  total,
  pageSize,
  currentPage,
  currentStatus,
  counts,
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const totalPages = Math.ceil(total / pageSize);

  async function handleAction(id: string, action: "approved" | "rejected") {
    setLoadingId(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Kommentarer</h1>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/comments?status=${tab.value}`}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              currentStatus === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground">
              {counts[tab.value]}
            </span>
          </Link>
        ))}
      </div>

      {comments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>Ingen kommentarer i denne kategori.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => (
            <li key={comment.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  {comment.authorEmail && (
                    <p className="text-xs text-muted-foreground">{comment.authorEmail}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <time dateTime={comment.createdAt.toISOString()}>
                      {formatDate(comment.createdAt)}
                    </time>
                    {" · "}
                    <Link
                      href={`/blog/${comment.post.slug}`}
                      className="hover:underline"
                      target="_blank"
                    >
                      {comment.post.title}
                    </Link>
                  </p>
                </div>

                {currentStatus === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 hover:text-green-700 hover:border-green-600"
                      disabled={loadingId === comment.id}
                      onClick={() => handleAction(comment.id, "approved")}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Godkend
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive hover:border-destructive"
                      disabled={loadingId === comment.id}
                      onClick={() => handleAction(comment.id, "rejected")}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Afvis
                    </Button>
                  </div>
                )}

                {currentStatus === "approved" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:border-destructive"
                    disabled={loadingId === comment.id}
                    onClick={() => handleAction(comment.id, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Afvis
                  </Button>
                )}

                {currentStatus === "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:border-green-600"
                    disabled={loadingId === comment.id}
                    onClick={() => handleAction(comment.id, "approved")}
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Godkend
                  </Button>
                )}
              </div>

              <p className="text-sm whitespace-pre-wrap break-words border-t pt-2 text-foreground/80">
                {comment.content}
              </p>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <p className="text-sm text-muted-foreground">
            Side {currentPage} af {totalPages} ({total} kommentarer)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              asChild={currentPage > 1}
            >
              {currentPage > 1 ? (
                <Link href={`/admin/comments?status=${currentStatus}&page=${currentPage - 1}`}>
                  <ChevronLeft className="w-4 h-4" />
                  Forrige
                </Link>
              ) : (
                <span>
                  <ChevronLeft className="w-4 h-4" />
                  Forrige
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              asChild={currentPage < totalPages}
            >
              {currentPage < totalPages ? (
                <Link href={`/admin/comments?status=${currentStatus}&page=${currentPage + 1}`}>
                  Næste
                  <ChevronRight className="w-4 h-4" />
                </Link>
              ) : (
                <span>
                  Næste
                  <ChevronRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
