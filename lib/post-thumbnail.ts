import { getAppUrl } from "@/lib/runtime-config";

type PostThumbnailInput = {
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: string | null;
};

export function getPostThumbnailSrc(post: PostThumbnailInput): string {
  const coverImage = post.coverImage?.trim();

  if (coverImage) {
    return coverImage;
  }

  const searchParams = new URLSearchParams({
    title: post.title,
  });

  if (post.excerpt) {
    searchParams.set("excerpt", post.excerpt);
  }

  if (post.category) {
    searchParams.set("category", post.category);
  }

  return `/api/og?${searchParams.toString()}`;
}

export function getPostThumbnailUrl(
  post: PostThumbnailInput,
  origin: string
): string {
  return new URL(getPostThumbnailSrc(post), origin).toString();
}

export function getPostThumbnailAppUrl(post: PostThumbnailInput): string {
  return getAppUrl(getPostThumbnailSrc(post));
}