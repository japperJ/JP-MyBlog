import { getAppUrl } from "@/lib/runtime-config";

type PostThumbnailInput = {
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: string | null;
};

function buildOgThumbnailSrc(post: PostThumbnailInput): string {
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

export function getPostThumbnailSrc(
  post: PostThumbnailInput,
  fallbackSrc?: string | null
): string {
  const coverImage = post.coverImage?.trim();

  if (coverImage) {
    return coverImage;
  }

  const fallback = fallbackSrc?.trim();
  if (fallback) {
    return fallback;
  }

  return buildOgThumbnailSrc(post);
}

export function getPostThumbnailUrl(
  post: PostThumbnailInput,
  origin: string,
  fallbackSrc?: string | null
): string {
  return new URL(getPostThumbnailSrc(post, fallbackSrc), origin).toString();
}

export function getPostThumbnailAppUrl(
  post: PostThumbnailInput,
  fallbackSrc?: string | null
): string {
  return getAppUrl(getPostThumbnailSrc(post, fallbackSrc));
}