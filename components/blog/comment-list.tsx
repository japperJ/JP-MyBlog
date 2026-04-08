import { formatDate } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: Date;
}

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
        <MessageSquare className="w-8 h-8 opacity-40" />
        <p className="text-sm">Be the first to leave a comment.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-6 mb-12">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm select-none">
            {comment.authorName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline gap-2 mb-1">
              <span className="font-medium text-sm">{comment.authorName}</span>
              <time
                dateTime={comment.createdAt.toISOString()}
                className="text-xs text-muted-foreground"
              >
                {formatDate(comment.createdAt)}
              </time>
            </div>
            {/* Plain text only — no HTML rendering to prevent XSS */}
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
              {comment.content}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
