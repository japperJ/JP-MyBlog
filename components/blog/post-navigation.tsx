import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface NavPost {
  title: string;
  slug: string;
}

interface PostNavigationProps {
  prevPost: NavPost | null;
  nextPost: NavPost | null;
}

/**
 * Previous / Next post navigation.
 * Server-compatible (no "use client") — just links.
 * Renders nothing if both prev and next are null.
 */
export function PostNavigation({ prevPost, nextPost }: PostNavigationProps) {
  if (!prevPost && !nextPost) return null;

  return (
    <nav
      className="mt-12 pt-8 border-t grid grid-cols-2 gap-4"
      aria-label="Post navigation"
    >
      {/* Previous post — left side */}
      {prevPost ? (
        <Link
          href={`/blog/${prevPost.slug}`}
          className="group flex items-start gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Previous Post
            </span>
            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {prevPost.title}
            </p>
          </div>
        </Link>
      ) : (
        <div />
      )}

      {/* Next post — right side */}
      {nextPost ? (
        <Link
          href={`/blog/${nextPost.slug}`}
          className="group flex items-start gap-2 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-right justify-end"
        >
          <div className="min-w-0">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              Next Post
            </span>
            <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {nextPost.title}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
      ) : (
        <div />
      )}
    </nav>
  );
}
