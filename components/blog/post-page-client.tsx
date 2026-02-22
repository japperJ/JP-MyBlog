"use client";

import { useRef } from "react";
import { Navigation } from "@/components/navigation";
import { PostContent } from "@/components/blog/post-content";
import { ReadingProgress } from "@/components/blog/reading-progress";
import { formatDate } from "@/lib/utils";
import { Clock, Eye, Calendar } from "lucide-react";
import { notFound } from "next/navigation";

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
  readingTime: number;
  views: number;
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

export default function PostPage({ post }: { post: Post }) {
  const articleRef = useRef<HTMLElement>(null);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Navigation />
      <ReadingProgress target={articleRef} />
      <article ref={articleRef} className="min-h-screen">
        {/* Cover Image */}
        {post.coverImage && (
          <div className="w-full h-96 overflow-hidden">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="container mx-auto px-4 py-12 max-w-4xl">
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
                <img
                  src={post.author.avatar}
                  alt={post.author.name || "Author"}
                  className="w-10 h-10 rounded-full"
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
              {post.views} views
            </div>
          </div>

          {/* Content */}
          <PostContent content={post.content} />

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t">
              <div className="flex flex-wrap gap-2">
                {post.tags.map(({ tag }) => (
                  <span
                    key={tag.slug}
                    className="text-sm bg-muted px-3 py-1 rounded hover:bg-muted/70 transition-colors"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Author Bio */}
          {post.author.bio && (
            <div className="mt-12 p-6 bg-muted rounded-lg">
              <div className="flex items-start gap-4">
                {post.author.avatar && (
                  <img
                    src={post.author.avatar}
                    alt={post.author.name || "Author"}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <h3 className="font-bold text-lg mb-2">About {post.author.name}</h3>
                  <p className="text-muted-foreground">{post.author.bio}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
