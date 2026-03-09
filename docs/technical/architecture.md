---
title: "Architecture Overview"
description: "System architecture for JP-MyBlog — Next.js 15 App Router, ISR strategy, Prisma + PostgreSQL data model, component hierarchy, and data flow"
category: technical
created: 2025-01-15
updated: 2025-07-26
---

# Architecture Overview

JP-MyBlog is a server-rendered blog built on Next.js 15 (App Router), Prisma ORM, and PostgreSQL, deployed to Vercel's Hobby tier. Public content is served through ISR-cached pages. A protected admin dashboard handles content management. Interactive features — search, table of contents, code theme switching, share buttons — are client-side React components hydrated after server render.

## System Invariants

> [!important] Design contracts
> These properties must hold true at all times. Any code change that violates them is a bug.

1. **Edge middleware never self-fetches.** `middleware.ts` only reads cookies — never calls internal API routes. Self-fetch causes deadlocks on Vercel Hobby. See [[design-decisions#edge-middleware]].
2. **Session validation runs in Node.js, not Edge.** `app/admin/layout.tsx` calls Prisma directly — no HTTP round-trip from middleware.
3. **Vercel deployments never write to the filesystem.** `lib/runtime-config.ts:areFilesystemUploadsDisabled()` checks `VERCEL`/`VERCEL_URL` env vars. Upload API returns 501.
4. **`DATABASE_URL` must be external on Vercel.** `lib/prisma.ts` throws at module load if a Vercel deployment uses a localhost URL.
5. **All public pages use ISR with `revalidate = 60`.** Content freshness is guaranteed within 60 seconds. New slugs render on-demand via `dynamicParams = true`.
6. **Auth cookies are host-only.** No `domain` attribute — sessions don't leak between preview URLs, localhost, and production.
7. **`extractHeadings()` IDs match `rehype-slug` IDs.** Both use `github-slugger` internally. Breaking this breaks the Table of Contents. See [[markdown-pipeline#heading-id-invariant]].

## Technology Stack

| Layer | Technology | Version | Source |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.5.12 | `package.json` |
| Language | TypeScript | ^5 | `tsconfig.json` |
| React | React | ^19.0.0 | `package.json` |
| ORM | Prisma | ^5.19.1 | `package.json` |
| Database | PostgreSQL | External (Neon recommended) | `prisma/schema.prisma` |
| Styling | Tailwind CSS | ^3.4.1 | `package.json` |
| Components | shadcn/ui (New York style) | Via `components.json` | `components.json` |
| Themes | next-themes | ^0.4.4 | `package.json` |
| Icons | lucide-react | ^0.468.0 | `package.json` |
| Markdown | react-markdown | ^9.0.1 | `package.json` |
| Search | cmdk | ^1.1.1 | `package.json` |
| Validation | zod | ^3.24.1 | `package.json` |
| Auth | Custom (bcryptjs + session cookie) | bcryptjs ^3.0.3 | `lib/auth.ts` |
| MFA | otplib + qrcode | ^13.3.0 / ^1.5.4 | `lib/mfa.ts` |
| OG Images | @vercel/og | ^0.6.8 | `app/api/og/route.tsx` |
| Testing | Playwright | ^1.58.2 | `playwright.config.ts` |
| Image Processing | sharp | ^0.33.5 | `package.json` |
| Hosting | Vercel Hobby tier | — | `.vercel/` |

> [!note] Phantom dependencies
> `rehype-highlight`, `better-auth`, `date-fns`, and the Prisma `fullTextSearch` preview feature are all in `package.json` or the Prisma schema but are **not used at runtime**. See [[design-decisions]] for rationale.

## Request Flow

```
Browser → Vercel CDN → Edge Middleware → Next.js App Router
                                              │
                              ┌────────────────┼────────────────┐
                              │                │                │
                        Public pages     Admin pages       API routes
                        (ISR cached)     (server-side)     (serverless)
                              │                │                │
                              └────────────────┼────────────────┘
                                               │
                                         Prisma Client
                                               │
                                         PostgreSQL (Neon)
```

### Public page request

1. Vercel CDN checks for a cached ISR response.
2. If cached and fresh (< 60s): serve directly, skip server entirely.
3. If stale or missing: Edge middleware runs (pass-through for public routes), App Router renders the page, Prisma queries the database, response is cached.

### Admin page request

1. Edge middleware checks for `auth_session` cookie existence.
2. No cookie → redirect to `/admin/login?from={pathname}`.
3. Cookie exists → forward request with `x-pathname` header.
4. `app/admin/layout.tsx` validates session via Prisma (DB lookup), checks role, enforces MFA policy.
5. Invalid session → redirect to login. Valid session → render admin page.

### API request

API routes run as serverless functions. Auth-protected endpoints call `requireAuth()` or `requireAdmin()` from `lib/auth.ts`, which reads the cookie and queries the database. See [[api-reference]] for the full route catalog.

## Rendering Strategy

| Page type | Strategy | Details |
|---|---|---|
| **Public pages** (7 routes) | ISR with `revalidate = 60` | `dynamicParams = true` for slug-based routes. New posts appear within 60s without redeploy. Admin CRUD calls `revalidatePath()` for immediate cache busting. |
| **Admin pages** (10 routes) | Client-side rendering | Server-validated sessions in `app/admin/layout.tsx`. Admin layout checks role + MFA enforcement before rendering children. |
| **Single post page** | Hybrid | Server component fetches post data + increments views + extracts headings. Client component (`PostPageClient`) renders interactive elements: TOC scroll-spy, share buttons, code theme switching, reading progress bar. |

### Public Page Routes

| Route | File | ISR | Key Features |
|---|---|---|---|
| `/` | `app/page.tsx` | `revalidate=60` | Hero, 3 featured posts, 6 latest posts |
| `/blog` | `app/blog/page.tsx` | `revalidate=60` | CategoryFilter pills, 9-per-page pagination, URL-driven state |
| `/blog/[slug]` | `app/blog/[slug]/page.tsx` | `revalidate=60`, `dynamicParams=true` | Full post, TOC, share buttons, prev/next nav, related posts, JSON-LD |
| `/blog/categories` | `app/blog/categories/page.tsx` | `revalidate=60` | All categories with post counts |
| `/blog/category/[slug]` | `app/blog/category/[slug]/page.tsx` | `revalidate=60`, `dynamicParams=true` | Posts filtered by category |
| `/blog/tag/[slug]` | `app/blog/tag/[slug]/page.tsx` | `revalidate=60`, `dynamicParams=true` | Posts filtered by tag |
| `/not-found` | `app/not-found.tsx` | — | Minimal 404 page |

### Admin Routes

| Route | File | Auth Level |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | `requireAuth()` |
| `/admin/login` | `app/admin/login/page.tsx` | None (public) |
| `/admin/posts` | `app/admin/posts/page.tsx` | `requireAuth()` |
| `/admin/posts/new` | `app/admin/posts/new/page.tsx` | `requireAuth()` |
| `/admin/posts/[id]/edit` | `app/admin/posts/[id]/edit/page.tsx` | `requireAuth()` |
| `/admin/categories` | `app/admin/categories/page.tsx` | `requireAuth()` |
| `/admin/tags` | `app/admin/tags/page.tsx` | `requireAuth()` |
| `/admin/media` | `app/admin/media/page.tsx` | `requireAuth()` |
| `/admin/settings` | `app/admin/settings/page.tsx` | `requireAuth()` |
| `/admin/users` | `app/admin/users/page.tsx` | `requireAdmin()` |

### SEO / Feed Routes

| Route | File | Purpose |
|---|---|---|
| `/feed.xml` | `app/feed.xml/route.ts` | RSS 2.0 feed, 20 latest published posts |
| `/sitemap.xml` | `app/sitemap.ts` | Dynamic sitemap: homepage, blog, categories, all posts, all category pages |
| `/robots.txt` | `app/robots.ts` | Allows `/`, disallows `/admin/` and `/api/auth/` |

## Prisma + PostgreSQL Data Model

Source: `prisma/schema.prisma`

> [!note] fullTextSearch preview feature
> The Prisma schema enables `fullTextSearch` and `fullTextIndex` preview features, but **no query uses them**. Search uses `contains` + `mode: insensitive` via a server action. This is intentional — see [[design-decisions#search]].

### Models

**User** — Admin accounts and author profiles

| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | `@id @default(cuid())` | |
| `email` | String | `@unique` | Login identifier |
| `name` | String? | | Display name |
| `passwordHash` | String | | bcrypt hash (10 rounds) |
| `role` | String | `@default("admin")` | `"admin"` or `"editor"` |
| `avatar` | String? | | URL |
| `bio` | String? | | Displayed on post page author card |
| `mfaEnabled` | Boolean | `@default(false)` | |
| `mfaSecret` | String? | | Active TOTP secret |
| `pendingMfaSecret` | String? | | Pre-verification TOTP secret |
| `mfaRequired` | Boolean | `@default(false)` | Admin-enforced MFA policy |
| `createdAt` | DateTime | `@default(now())` | |
| `updatedAt` | DateTime | `@updatedAt` | |

Relations: `posts Post[]`, `sessions Session[]`. Table: `users`.

**Session** — Database-backed auth sessions

| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | `@id @default(cuid())` | |
| `userId` | String | `@@index([userId])` | FK to User |
| `token` | String | `@unique` | 32-byte random hex |
| `expiresAt` | DateTime | | 7 days from creation |
| `createdAt` | DateTime | `@default(now())` | |

Relation: `user User` (cascade delete). Table: `sessions`.

**Post** — Blog content

| Field | Type | Attributes | Notes |
|---|---|---|---|
| `id` | String | `@id @default(cuid())` | |
| `title` | String | | Max 200 chars (Zod) |
| `slug` | String | `@unique`, `@@index([slug])` | Auto-generated from title via `slugify()` |
| `excerpt` | String? | | |
| `content` | String | | Markdown body |
| `coverImage` | String? | | Must be `https://` URL or `/uploads/` path |
| `published` | Boolean | `@default(false)` | |
| `featured` | Boolean | `@default(false)` | Shown on homepage |
| `views` | Int | `@default(0)` | Incremented on every page render |
| `readingTime` | Int | `@default(0)` | Minutes, calculated at 200 WPM |
| `publishedAt` | DateTime? | `@@index([published, publishedAt])` | Set when first published |
| `createdAt` | DateTime | `@default(now())` | |
| `updatedAt` | DateTime | `@updatedAt` | |
| `authorId` | String | `@@index([authorId])` | FK to User |

Relations: `author User` (cascade), `categories PostCategory[]`, `tags PostTag[]`. Table: `posts`.

**Category** — Content grouping

| Field | Type | Attributes |
|---|---|---|
| `id` | String | `@id @default(cuid())` |
| `name` | String | `@unique` |
| `slug` | String | `@unique` |
| `description` | String? | |
| `createdAt` | DateTime | `@default(now())` |
| `updatedAt` | DateTime | `@updatedAt` |

Relation: `posts PostCategory[]`. Table: `categories`.

**Tag** — Granular content labels

| Field | Type | Attributes |
|---|---|---|
| `id` | String | `@id @default(cuid())` |
| `name` | String | `@unique` |
| `slug` | String | `@unique` |
| `createdAt` | DateTime | `@default(now())` |
| `updatedAt` | DateTime | `@updatedAt` |

Relation: `posts PostTag[]`. Table: `tags`. Note: **no description field** (unlike Category).

**PostCategory** / **PostTag** — Many-to-many junction tables

| Table | Fields | Key |
|---|---|---|
| `post_categories` | `postId`, `categoryId` | Composite PK, both FKs cascade on delete |
| `post_tags` | `postId`, `tagId` | Composite PK, both FKs cascade on delete |

### Key Indexes

- `posts.slug` — unique, optimizes slug-based lookups
- `posts.[published, publishedAt]` — composite, optimizes listing queries
- `sessions.token` — unique, optimizes session lookup
- `sessions.[userId]` — optimizes session cleanup on user operations

### Prisma Singleton

`lib/prisma.ts` uses the global-for-dev pattern (`globalThis`) to prevent connection pool exhaustion during HMR. On Vercel, each serverless function gets its own Prisma instance — the global pattern only matters for local development.

## Component Hierarchy

### Root Layout (`app/layout.tsx`)

```
<html>
  <head>
    <link data-highlight-theme (CDN highlight.js)>
    <script type="application/ld+json" (WebSite schema)>
  </head>
  <body>
    <ThemeProvider attribute="class" defaultTheme="dark">
      {children}                    ← page content
      <SearchDialog />             ← ⌘K command palette (global)
      <BackToTop />                ← scroll-to-top button (global)
      <CodeTheme />                ← highlight.js theme manager (global)
    </ThemeProvider>
  </body>
</html>
```

### Navigation (`components/navigation.tsx`)

```
<nav> (sticky, backdrop-blur, z-50)
  Logo: "AICodingBlog"
  Desktop (hidden below md):
    Links: Blog, Categories, Admin
    Search trigger button (outline, ⌘K badge)
    Theme toggle (Sun/Moon)
  Mobile (hidden above md):
    Search icon button (ghost)
    Theme toggle
    Sheet hamburger (Menu icon)                    ← Sheet from shadcn/ui
      Sheet content: Blog, Categories, Admin links
```

### Blog Listing Page (`app/blog/page.tsx`)

```
<Navigation />
<main>
  Header: "All Posts"
  <CategoryFilter />                               ← pill buttons, URL-driven
  Post grid (3-col, 9 per page)
    <PostCard /> × N
  <BlogPagination />                               ← URL-driven, ?page=N, preserves ?category
</main>
<Footer />
```

### Single Post Page (`app/blog/[slug]/page.tsx` → `PostPageClient`)

```
Server component (page.tsx):
  Prisma: fetch post, increment views
  Prisma: parallel fetch relatedPosts, prevPost, nextPost
  extractHeadings(post.content)
  Build breadcrumbs, blogPosting JSON-LD

PostPageClient (client component):
  <Navigation />
  <ReadingProgress />
  <article>
    Cover image (full-width, 384px)
    Header area (max-w-4xl):
      {breadcrumbs}
      Category badges
      Title (5xl)
      Excerpt (xl muted)
      Meta bar: avatar, name, date, reading time, views
    Mobile TOC (below lg, collapsible)
    Two-column grid (lg: content + 250px sidebar):
      Left column:
        <PostContent />                            ← see [[markdown-pipeline]]
        Tags (clickable Links to /blog/tag/[slug])
        <ShareButtons /> (X, LinkedIn, Reddit, Copy Link)
        Author bio card
        <PostNavigation /> (← Previous / Next →)
        <RelatedPosts />
      Right column (lg only, sticky):
        <TableOfContents /> (scroll-spy via IntersectionObserver)
  </article>
  <Footer />
```

### Footer (`components/footer.tsx`)

```
<footer> (border-t, bg-muted/30)
  4-column responsive grid (lg:4 → md:2 → mobile:1):
    About: Logo + description blurb
    Navigation: Home, Blog, Categories, RSS Feed
    Connect: GitHub, LinkedIn, X, RSS (icon buttons)
    Resources: RSS Feed, Sitemap, "Built with Next.js"
  Copyright: © {year} AI Coding Blog. Built with Next.js.
```

Present on: Homepage, Blog listing, Single post, Categories, Category/[slug], Tag/[slug].
**Not on:** Admin pages (intentionally excluded).

## Auth Architecture Summary

> [!warning] Edge middleware limitation
> Edge middleware does cookie-presence checks only — **no database calls**. Self-fetch from Edge to Serverless deadlocks on Vercel Hobby tier (documented in `middleware.ts`). See [[design-decisions#edge-middleware]] for the full rationale.

1. **Edge Middleware** (`middleware.ts`): Reads `auth_session` cookie. No cookie on `/admin/*` → redirect to `/admin/login?from=pathname`. Always passes `/api/auth/*` through.
2. **Admin Layout** (`app/admin/layout.tsx`): Full Prisma-based session validation. Checks token validity, role authorization, MFA enforcement.
3. **Session**: Cookie name `auth_session`, httpOnly, secure in production, sameSite strict, host-only (no domain attribute), 7-day expiry. Token is 32-byte random hex stored in DB.
4. **Rate Limiting**: In-process `Map`-based. 5 attempts/60s on login, MFA verify, MFA disable. Prunes expired entries every 60s.

For the full auth deep dive, see [[auth-system]].

## ISR Strategy

All public pages export `revalidate = 60`:

| Page | `dynamicParams` | Notes |
|---|---|---|
| `app/page.tsx` | N/A | Homepage — featured + latest posts |
| `app/blog/page.tsx` | N/A | Blog listing with pagination |
| `app/blog/[slug]/page.tsx` | `true` | New slugs render on-demand |
| `app/blog/categories/page.tsx` | N/A | Category listing |
| `app/blog/category/[slug]/page.tsx` | `true` | Posts by category |
| `app/blog/tag/[slug]/page.tsx` | `true` | Posts by tag |

**On-demand revalidation:** Admin post CRUD calls `revalidatePath()` for `/`, `/blog`, and `/blog/[slug]` to immediately bust the ISR cache. Between explicit revalidations, stale content is served for up to 60 seconds.

**Trade-off:** ISR couples builds to database availability (Neon outage blocks deploys). The alternative — fully dynamic rendering — would increase TTFB and DB load. For a blog, ISR is the better trade-off. See [[design-decisions#rendering-strategy]].

## Rate Limiting

`lib/rate-limit.ts` implements an in-memory, per-process rate limiter keyed by client IP (`x-forwarded-for` / `x-real-ip`).

- **Window:** 60 seconds
- **Limit:** 5 attempts per IP per window
- **Applied to:** POST `/api/auth/login`, POST `/api/auth/mfa/verify`, POST `/api/auth/mfa/disable`
- **Pruning:** Expired entries cleaned every 60 seconds

> [!warning] Single-instance limitation
> The in-process `Map` resets on serverless cold starts and doesn't share state across instances. Acceptable for Vercel Hobby (single instance). A Redis-backed solution (e.g., Upstash) is needed for multi-instance scale.

## Known Limitations

- **View count has no deduplication.** `views` increments on every server render — bots, ISR revalidation, page reloads all count. This is a known limitation, not a bug.
- **No checked-in Prisma migrations.** Schema changes use `prisma db push`. Acceptable for initial rollout; should move to proper migrations before schema stabilizes.
- **In-memory rate limiting.** Resets on cold start. Single-instance only.
- **Shared database across environments.** Local dev, Preview, and Production share one DB during initial rollout.
- **No session sharing across hosts.** Each preview URL requires separate login. By design (host-only cookies).
- **`robots.txt` sitemap URL is hardcoded** to `https://jp-my-blog.vercel.app/sitemap.xml`. Must be updated manually if the domain changes.

## Known Failure Modes

| Symptom | Root Cause | Detection | Recovery |
|---|---|---|---|
| Admin pages hang 10s then 504 | Self-fetch reintroduced in middleware | Vercel function logs: Edge fetch timeout | Remove fetch from middleware; use layout validation |
| Login succeeds but admin redirects to login | Expired session in DB | Check `sessions` table | Clear cookies, log in again |
| MFA verify returns "invalid token" | `MFA_TOKEN_SECRET` mismatch across deploys | Compare env var across environments | Set a stable `MFA_TOKEN_SECRET` in Vercel |
| Build fails with Prisma connection error | DB unreachable at build time | Build logs | Verify `DATABASE_URL`, wake Neon DB |
| Pages show stale content beyond 60s | ISR cache not busted | Check revalidation logs | Redeploy or trigger revalidation |

## Source File Reference

| File | Purpose |
|---|---|
| `middleware.ts` | Edge middleware — cookie-presence gate for `/admin` routes |
| `app/admin/layout.tsx` | Server-side session, role, and MFA validation |
| `lib/auth.ts` | Session CRUD, password hashing, `requireAuth`/`requireAdmin` |
| `lib/prisma.ts` | Prisma singleton with hosted-database guard |
| `lib/runtime-config.ts` | Origin resolution, Vercel environment detection |
| `lib/mfa.ts` | TOTP secret/QR generation, token verification |
| `lib/mfa-token.ts` | HMAC-signed short-lived MFA challenge tokens |
| `lib/rate-limit.ts` | In-memory rate limiter with IP extraction |
| `lib/markdown.ts` | `extractHeadings()` for TOC generation |
| `prisma/schema.prisma` | Database schema (6 models + 2 junction tables) |
| `prisma/seed.ts` | Seed data (admin user, categories, tags, sample post) |

## Related Documentation

- [[api-reference]] — Complete API route catalog (28 handlers + 1 server action)
- [[markdown-pipeline]] — Markdown rendering chain, code highlighting, TOC heading invariant
- [[design-decisions]] — Why shadcn, why Prisma, why ISR, why custom auth, and 7 more ADRs
- [[auth-system]] — Deep dive into session lifecycle, MFA, and rate limiting
- [[deployment-model]] — Vercel Hobby constraints, environment variables, build pipeline
- [[seo-implementation]] — JSON-LD, metadata, sitemap, RSS, OG images
