"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Clock, Eye } from "lucide-react";

interface PostCardProps {
  post: {
    id: string;
    title: string;
    slug: string;
    excerpt?: string | null;
    coverImage?: string | null;
    publishedAt?: Date | null;
    readingTime: number;
    views: number;
    author: {
      name: string | null;
    };
    categories: Array<{
      category: {
        name: string;
        slug: string;
      };
    }>;
  };
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
        {post.coverImage && (
          <div className="w-full h-48 overflow-hidden rounded-t-lg">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex flex-wrap gap-2 mb-2">
            {post.categories.slice(0, 2).map(({ category }) => (
              <span
                key={category.slug}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
              >
                {category.name}
              </span>
            ))}
          </div>
          <h2 className="text-2xl font-bold line-clamp-2 hover:text-primary transition-colors">
            {post.title}
          </h2>
        </CardHeader>
        <CardContent className="flex-grow">
          {post.excerpt && (
            <p className="text-muted-foreground line-clamp-3">{post.excerpt}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readingTime} min
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {post.views}
            </span>
          </div>
          {post.publishedAt && (
            <span>{formatDate(post.publishedAt)}</span>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
