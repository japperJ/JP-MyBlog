import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";
import { getPostThumbnailSrc } from "@/lib/post-thumbnail";

interface RelatedPost {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: Date | null;
}

interface RelatedPostsProps {
  posts: RelatedPost[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (posts.length === 0) return null;

  return (
    <section className="mt-16 pt-8 border-t">
      <h2 className="text-2xl font-bold mb-6">Related Posts</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded-lg border bg-card hover:shadow-lg transition-shadow overflow-hidden"
          >
            <div className="relative w-full h-36 overflow-hidden">
              <Image
                src={getPostThumbnailSrc({
                  title: post.title,
                  excerpt: post.excerpt,
                  coverImage: post.coverImage,
                })}
                alt={post.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {post.excerpt}
                </p>
              )}
              {post.publishedAt && (
                <p className="text-xs text-muted-foreground mt-3">
                  {formatDate(post.publishedAt)}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
