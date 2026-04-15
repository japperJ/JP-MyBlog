"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { PostContent } from "@/components/blog/post-content";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { TableOfContents } from "@/components/blog/table-of-contents";
import { ShareButtons } from "@/components/blog/share-buttons";
import { Button } from "@/components/ui/button";
import { AdminEditPanel } from "@/components/blog/admin-edit-panel";
import { formatDate } from "@/lib/utils";
import { getPostThumbnailSrc } from "@/lib/post-thumbnail";
import { Clock, Eye, Calendar, MessageSquare } from "lucide-react";
import { notFound } from "next/navigation";

import type { ReactNode } from "react";

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  thumbnailUrl?: string | null;
  publishedAt: Date | null;
  readingTime: number;
  views: number;
  commentCount?: number;
  author: {
    name: string | null;
    avatar: string | null;
    bio: string | null;
  };
  categories: Array<{
    category: {
      name: string;
      slug: string;
    };
  }>;
  tags: Array<{
    tag: {
      name: string;
      slug: string;
    };
  }>;
}

interface PostPageProps {
  post: Post;
  /** Headings extracted from post content for the Table of Contents */
  headings: Heading[];
  /** Canonical share URL for the post */
  shareUrl: string;
  /** Server-rendered breadcrumbs with JSON-LD */
  breadcrumbs?: ReactNode;
  /** Server-rendered prev/next navigation */
  postNavigation?: ReactNode;
  /** Server-rendered related posts section */
  relatedPosts?: ReactNode;
  /** Server-rendered comment section */
  comments?: ReactNode;
  /** Whether the current session user is an admin */
  isAdmin?: boolean;
  /** Post database ID for the admin edit panel */
  postId?: string;
}

export default function PostPage({
  post,
  headings,
  shareUrl,
  breadcrumbs,
  postNavigation,
  relatedPosts,
  comments,
  isAdmin,
  postId,
}: PostPageProps) {
  if (!post) {
    notFound();
  }

  const articleRef = useRef<HTMLElement>(null);
  const thumbnailSrc = getPostThumbnailSrc({
    title: post.title,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    thumbnailUrl: post.thumbnailUrl,
    category: post.categories[0]?.category.name,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [viewCount, setViewCount] = useState(post.views);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/posts/${post.id}/view`, {
      method: "POST",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { counted?: boolean };
        if (data.counted) {
          setViewCount((current) => current + 1);
        }
      })
      .catch(() => {
        // Best effort only — view tracking should not affect rendering.
      });

    return () => controller.abort();
  }, [post.id]);

  // Only h2/h3 headings — determines whether to show the two-column TOC layout
  const hasToc = headings.filter((h) => h.level >= 2 && h.level <= 3).length > 0;

  return (
    <>
      <Navigation />
      <ReadingProgress target={articleRef} />
      <article ref={articleRef} className="min-h-screen">
        {/* Cover Image — full width, outside grid */}
        <div className="relative w-full h-96 overflow-hidden">
          <Image
            src={thumbnailSrc}
            alt={post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="container mx-auto px-4 py-12">
          {/* Header area — max-w-4xl, visually unchanged */}
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumbs */}
            {breadcrumbs}

            {/* Categories */}
            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories.map(({ category }) => (
                <span
                  key={category.slug}
                  className="text-sm bg-primary/10 text-primary px-3 py-1 rounded"
                >
                  {category.name}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-5xl font-bold mb-6">{post.title}</h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">{post.excerpt}</p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-6 mb-8 pb-8 border-b">
              <div className="flex items-center gap-2">
                {post.author.avatar && (
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name || "Author"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <span className="font-medium">{post.author.name}</span>
              </div>

              {post.publishedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {formatDate(post.publishedAt)}
                </div>
              )}

              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                {post.readingTime} min read
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="w-4 h-4" />
                {viewCount} views
              </div>

              {post.commentCount && post.commentCount > 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageSquare className="w-4 h-4" />
                  {post.commentCount} comments
                </div>
              ) : null}
            </div>
          </div>

          {/* Mobile TOC — visible below lg only */}
          {hasToc && (
            <div className="max-w-4xl mx-auto">
              <TableOfContents headings={headings} />
            </div>
          )}

          {/* Two-column grid: content + TOC sidebar at lg breakpoint */}
          <div
            className={
              hasToc
                ? "lg:grid lg:grid-cols-[minmax(0,1fr)_250px] lg:gap-8 max-w-5xl mx-auto"
                : "max-w-4xl mx-auto"
            }
          >
            {/* Left / main column */}
            <div className="min-w-0">
              {/* Content */}
              <PostContent content={post.content} />

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t">
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(({ tag }) => (
                      <Link
                        key={tag.slug}
                        href={`/blog/tag/${tag.slug}`}
                        className="text-sm bg-muted px-3 py-1 rounded hover:bg-muted/70 transition-colors"
                      >
                        #{tag.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Share Buttons */}
              <ShareButtons url={shareUrl} title={post.title} />

              {/* Author Bio */}
              {post.author.bio && (
                <div className="mt-12 p-6 bg-muted rounded-lg">
                  <div className="flex items-start gap-4">
                    {post.author.avatar && (
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name || "Author"}
                        width={64}
                        height={64}
                        className="rounded-full"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-lg mb-2">
                        About {post.author.name}
                      </h3>
                      <p className="text-muted-foreground">{post.author.bio}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Prev/Next Navigation */}
              {postNavigation}

              {/* Related Posts */}
              {relatedPosts}

              {/* Comment Section */}
              {comments}
            </div>

            {/* Right column — sticky TOC sidebar, hidden below lg */}
            {hasToc && (
              <aside className="hidden lg:block">
                <div className="sticky top-20">
                  <TableOfContents headings={headings} />
                </div>
              </aside>
            )}
          </div>
        </div>
      </article>

      {/* Admin floating edit button — only shown for admin sessions */}
      {isAdmin && postId && (
        <>
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              onClick={() => setEditOpen(true)}
              size="lg"
              className="shadow-lg gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit Post
            </Button>
          </div>
          <AdminEditPanel
            postId={postId}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
        </>
      )}
    </>
  );
}
