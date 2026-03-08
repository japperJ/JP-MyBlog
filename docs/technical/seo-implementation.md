# SEO Implementation

## Invariants

1. Every published post emits a `BlogPosting` JSON-LD schema with `headline`, `datePublished`, `dateModified`, `author`, and `publisher`.
2. The root layout emits a `WebSite` JSON-LD schema with a `SearchAction` potential action.
3. The sitemap includes all published posts and categories with accurate `lastModified` timestamps.
4. Canonical URLs are derived from the configured origin (via `lib/runtime-config.ts`), never hardcoded.
5. OG images are generated dynamically — no manual image creation required per post.

## JSON-LD structured data

### WebSite schema (`app/layout.tsx`)

Emitted once in the root layout's `<head>`:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "AI Coding Blog",
  "url": "{appOrigin}",
  "description": "A modern blog about AI coding, machine learning, and software development",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "{appOrigin}/blog?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

The `appOrigin` is resolved at build time via `getConfiguredAppOrigin()` in `lib/runtime-config.ts` (line 19). This reads `NEXT_PUBLIC_APP_URL` → `VERCEL_URL` → `http://localhost:3000` in priority order.

### BlogPosting schema (`app/blog/[slug]/page.tsx`)

Emitted per post as a `<script type="application/ld+json">` tag:

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Post Title",
  "description": "Post excerpt",
  "datePublished": "ISO 8601 timestamp",
  "dateModified": "ISO 8601 timestamp",
  "url": "{appOrigin}/blog/{slug}",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "{url}" },
  "image": "cover image URL or null",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "image": "author avatar URL or null"
  },
  "publisher": {
    "@type": "Organization",
    "name": "AI Coding Blog",
    "url": "{appOrigin}"
  }
}
```

**Design rationale:** Google's Rich Results requires at minimum `headline`, `author`, `datePublished`, and `image` for blog post rich snippets. The schema is built server-side during page rendering, so it's always in sync with database content.

### BreadcrumbList

Breadcrumbs are rendered visually via the `<Breadcrumbs>` component (`components/blog/breadcrumbs.tsx`) on individual post pages. The trail structure is:

```
Home > Blog > Category (if assigned) > Post Title
```

The breadcrumb data is passed from `app/blog/[slug]/page.tsx` (lines 196–206) to the component. Structured data for breadcrumbs can be added to the JSON-LD output for search engine consumption.

## Metadata generation

### Root metadata (`app/layout.tsx`)

The `metadata` export provides site-wide defaults:

- `metadataBase` — set to `getConfiguredAppOrigin()`, used by Next.js to resolve relative URLs in metadata
- `title.template` — `"%s | AI Coding Blog"` so post titles get the site suffix
- `openGraph` and `twitter` — default social sharing metadata
- `robots` — `index: true, follow: true`

### Per-post metadata (`app/blog/[slug]/page.tsx`, `generateMetadata`)

Each post page generates its own metadata:

- `title` — post title (uses the template from root layout)
- `description` — post excerpt
- `alternates.canonical` — canonical URL via `getAppUrl("/blog/{slug}")`
- `openGraph.images` — cover image URL, or dynamic OG image if no cover is set
- `twitter.card` — `summary_large_image`

**Why canonical URLs matter:** With multiple Vercel preview URLs and an eventual custom domain, canonical URLs prevent duplicate content penalties. The canonical always points to the configured origin.

## OG image pipeline

### How it works (`app/api/og/route.tsx`)

The OG image endpoint generates 1200×630 images on the fly using `@vercel/og` (which uses Satori under the hood to render JSX to an image).

**Runtime:** Edge Runtime (lightweight, fast cold starts)

**Input parameters (query string):**
- `title` (required) — post title
- `excerpt` (optional) — truncated to 150 characters
- `category` (optional) — shown below the site name

**Output:** A PNG image with a purple gradient background, white text, and the blog's hostname.

**Fallback logic in `generateMetadata`:**
1. If the post has a `coverImage`, use that as the social image.
2. If no cover image, construct a URL to `/api/og?title=...&excerpt=...&category=...`.

This means every post has a social sharing image without any manual work.

### Performance characteristics

OG images are generated on demand and cached by Vercel's CDN. First request cold-start latency is typically 50–200ms on Edge Runtime. Subsequent requests for the same parameters are served from cache.

## Robots.txt (`app/robots.ts`)

```typescript
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/auth/"],
    },
    sitemap: "https://jp-my-blog.vercel.app/sitemap.xml",
  };
}
```

**What's blocked:**
- `/admin/` — all admin dashboard pages
- `/api/auth/` — authentication endpoints

**What's allowed:** Everything else, including `/blog/`, `/api/og` (so social crawlers can fetch OG images), and `/feed.xml`.

**Trade-off:** The sitemap URL is currently hardcoded to the production URL. If the blog moves to a custom domain, this needs to be updated to use `getConfiguredAppOrigin()`. This is a known limitation.

## Sitemap generation (`app/sitemap.ts`)

The sitemap is generated dynamically on each request:

1. Queries all published posts and all categories from the database via Prisma.
2. Reads request headers to determine the correct base URL via `getPreferredAppOrigin()`.
3. Returns a structured sitemap with:

| URL pattern | Priority | Change frequency |
|-------------|----------|-----------------|
| `/` (homepage) | 1.0 | daily |
| `/blog` | 0.9 | daily |
| `/blog/categories` | 0.7 | weekly |
| `/blog/{post-slug}` | 0.8 | weekly |
| `/blog/category/{category-slug}` | 0.6 | weekly |

Each entry includes a `lastModified` timestamp from the database (`updatedAt` field).

## RSS feed (`app/feed.xml/route.ts`)

Generates an RSS 2.0 XML feed with Atom self-link:

- Includes the 20 most recent published posts
- Uses `getPreferredAppOrigin()` for all URLs
- Sets `Cache-Control: public, max-age=3600, s-maxage=3600` (1 hour CDN cache)
- Content-Type: `application/xml`

## ISR revalidation strategy

**Default revalidation:** `revalidate = 60` on all public pages.

**On-demand revalidation:** Admin API endpoints call `revalidatePath()` when posts are created, updated, or deleted. This immediately marks the cached page as stale, so the next request triggers a fresh render.

**How they interact:**
- A post is edited → `revalidatePath("/blog/{slug}")` is called → next visitor gets fresh content
- Between edits, pages are served from ISR cache for up to 60 seconds
- New posts (slugs that didn't exist at build time) are rendered on-demand via `dynamicParams = true`

**Why 60 seconds and not 0?** A `revalidate = 0` would make every page request hit the database. For a blog with relatively infrequent updates, 60 seconds provides a good balance between freshness and database load. The Neon free tier has connection limits; aggressive revalidation could exhaust them.

## Source file reference

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root metadata, `metadataBase`, WebSite JSON-LD |
| `app/blog/[slug]/page.tsx` | Per-post metadata, BlogPosting JSON-LD, breadcrumbs, OG image fallback |
| `app/api/og/route.tsx` | Dynamic OG image generation (Edge Runtime) |
| `app/robots.ts` | Robots.txt generation |
| `app/sitemap.ts` | Dynamic sitemap generation |
| `app/feed.xml/route.ts` | RSS feed generation |
| `lib/runtime-config.ts` | Origin resolution (`getConfiguredAppOrigin`, `getPreferredAppOrigin`, `getAppUrl`) |

## Known failure modes

| Symptom | Root cause | Detection | Recovery |
|---------|-----------|-----------|----------|
| OG images show wrong hostname | `NEXT_PUBLIC_APP_URL` not set, `VERCEL_URL` returns internal hostname | Check OG image URL in page source | Set `NEXT_PUBLIC_APP_URL` to your public URL |
| Sitemap has localhost URLs | Build ran without `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` | Inspect `/sitemap.xml` | Set environment variables, redeploy |
| Google Search Console reports duplicate content | Multiple preview URLs indexed without canonical | Search Console "Coverage" report | Set canonical URLs via `NEXT_PUBLIC_APP_URL`, add `noindex` to preview deployments if needed |
| RSS feed empty | No published posts in database | Visit `/feed.xml` directly | Publish at least one post |
