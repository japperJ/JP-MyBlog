# System Architecture

## Overview

JP-MyBlog is a server-rendered blog application built on Next.js 15 (App Router), Prisma ORM, and PostgreSQL, deployed to Vercel's Hobby tier. It serves public blog content through ISR-cached pages and provides a protected admin dashboard for content management.

## System invariants

These properties must hold true at all times. Any code change that violates these invariants is a bug.

1. **Edge middleware never self-fetches.** The middleware (`middleware.ts`) only reads cookies. It never calls internal API routes. See [Why not self-fetch?](#why-edge-middleware-doesnt-self-fetch) below.
2. **Session validation happens in the Node.js runtime, not at the edge.** The admin layout (`app/admin/layout.tsx`) calls Prisma directly — no HTTP round-trip.
3. **Vercel-hosted deployments never write to the local filesystem.** Upload requests return 501 when `VERCEL` or `VERCEL_URL` environment variables are detected (`lib/runtime-config.ts:areFilesystemUploadsDisabled`).
4. **`DATABASE_URL` must point to an external PostgreSQL host on Vercel.** The Prisma singleton (`lib/prisma.ts`) throws at module load time if a Vercel deployment uses a localhost database URL.
5. **All public pages are ISR-cached with `revalidate = 60`.** Fresh content appears within 60 seconds without redeployment. New slugs are rendered on-demand via `dynamicParams = true`.
6. **Auth cookies are host-only.** Sessions don't carry between different preview URLs, localhost, and production.

## Technology stack

| Layer | Technology | Source |
|-------|-----------|--------|
| Framework | Next.js 15.5, App Router | `package.json` |
| Language | TypeScript 5 | `tsconfig.json` |
| ORM | Prisma 5.19 | `prisma/schema.prisma` |
| Database | PostgreSQL (Neon free tier) | External service |
| Auth | Custom session-based (bcrypt + cookie) | `lib/auth.ts` |
| MFA | TOTP via otplib | `lib/mfa.ts`, `lib/mfa-token.ts` |
| Hosting | Vercel Hobby tier | `.vercel/` |
| Styling | Tailwind CSS 3.4 + Radix UI primitives | `tailwind.config.ts` |
| OG Images | `@vercel/og` (Edge Runtime) | `app/api/og/route.tsx` |

## Request flow

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
2. No cookie → redirect to `/admin/login`.
3. Cookie exists → forward request with `x-pathname` header.
4. `app/admin/layout.tsx` validates the session via Prisma (database lookup).
5. Invalid session → redirect to login. Valid session → render the admin page.

### API request

API routes run as serverless functions. Auth-protected endpoints call `requireAuth()` or `requireAdmin()` from `lib/auth.ts`, which reads the cookie and queries the database.

## Why edge middleware doesn't self-fetch

**Rejected alternative:** Using `fetch("/api/auth/session")` inside middleware to validate sessions.

**Why it fails on Vercel Hobby:**

The Edge Runtime and serverless functions share a limited concurrency pool on the Hobby tier. When middleware fetches an internal API route:

1. The Edge function occupies one execution slot while waiting for the response.
2. The serverless function handling `/api/auth/session` needs a slot to run.
3. On cold start (common on Hobby tier), the serverless function is queued behind the Edge invocation.
4. **Deadlock:** Edge waits for serverless, serverless waits for a free slot, nothing progresses.

**Chosen design:** Middleware checks only cookie *existence*. Full session validation (database lookup, role check, MFA enforcement) runs in the admin layout's server component, which executes in the Node.js runtime and calls Prisma directly. This eliminates the HTTP round-trip entirely.

See `middleware.ts` lines 1–20 for the inline rationale comment.

## Why not NextAuth

**Rejected alternative:** Using NextAuth (next-auth) for authentication.

**Why it was rejected:**

1. **Complexity mismatch.** This is a single-admin blog. NextAuth's provider abstraction, callback chains, and adapter system add configuration overhead without a matching benefit.
2. **Session control.** The app needs direct control over session creation, expiry, and invalidation (e.g., destroying other sessions after MFA changes). NextAuth's session management is less transparent.
3. **MFA integration.** NextAuth doesn't have built-in TOTP/MFA support. Bolting custom MFA onto NextAuth's callback flow is more complex than a custom session system.
4. **No OAuth requirement.** There are no third-party login providers. A simple email/password + bcrypt + database session is sufficient.

The `NEXTAUTH_*` environment variables in `.env.example` are legacy artifacts from early development. They are not used by the current runtime.

## Why not local file uploads on Vercel

**Rejected alternative:** Using the local filesystem (`public/uploads/`) for image storage on Vercel.

**Why it fails:**

Vercel serverless functions run in ephemeral containers. Files written to the filesystem during a request are discarded when the container is recycled. The `public/` directory is only available as built at deploy time.

**Chosen design:** `lib/runtime-config.ts` exports `areFilesystemUploadsDisabled()`, which returns `true` when `VERCEL` or `VERCEL_URL` environment variables are present. The upload API (`app/api/upload/route.ts`) returns a 501 with a descriptive message. Users paste external HTTPS image URLs instead.

Local development retains filesystem upload support for convenience.

## Database architecture

The Prisma schema (`prisma/schema.prisma`) defines six models:

| Model | Purpose | Key relationships |
|-------|---------|-------------------|
| `User` | Admin accounts, author profiles | Has many `Post`, `Session` |
| `Session` | Database-backed auth sessions | Belongs to `User`, cascade delete |
| `Post` | Blog content | Belongs to `User`, many-to-many with `Category` and `Tag` |
| `Category` | Content grouping | Many-to-many with `Post` via `PostCategory` |
| `Tag` | Granular content labels | Many-to-many with `Post` via `PostTag` |
| `PostCategory` / `PostTag` | Join tables | Composite primary keys |

Key indexes: `posts.slug` (unique), `posts.[published, publishedAt]` (listing queries), `sessions.token` (unique, lookup).

The Prisma singleton in `lib/prisma.ts` uses the global-for-dev pattern to avoid exhausting database connections during HMR.

## ISR strategy

All public pages export `revalidate = 60`:
- `app/page.tsx` (homepage)
- `app/blog/[slug]/page.tsx` (individual posts)
- Blog listing and category pages

Post CRUD operations in the admin API call `revalidatePath()` to immediately invalidate the cache for affected pages. Between explicit revalidations, ISR serves stale content for up to 60 seconds.

`dynamicParams = true` on `app/blog/[slug]/page.tsx` ensures that posts created after the last build are rendered on-demand — no redeploy required.

## Rate limiting

`lib/rate-limit.ts` implements an in-memory, per-process rate limiter. It's suitable for single-instance deployments (Vercel Hobby) but would need to be replaced with a distributed store (e.g., Upstash Redis) for multi-instance production deployments.

The store prunes expired entries every 60 seconds to prevent unbounded memory growth.

## Known limitations

- **No checked-in Prisma migrations.** Schema changes use `prisma db push`. This is acceptable for the initial rollout but should move to proper migrations before the schema stabilizes.
- **In-memory rate limiting.** Acceptable for single-instance Hobby tier. Not suitable for production at scale.
- **Shared database across environments.** Local dev, Vercel Development, and Vercel Preview share one database during the initial rollout.
- **No session sharing across hosts.** Each preview URL requires a separate login. This is by design (host-only cookies) but can be surprising.

## Source file reference

| File | Purpose |
|------|---------|
| `middleware.ts` | Edge middleware — cookie-presence gate for `/admin` routes |
| `app/admin/layout.tsx` | Server-side session, role, and MFA validation |
| `lib/auth.ts` | Session CRUD, password hashing, `requireAuth`/`requireAdmin` |
| `lib/prisma.ts` | Prisma singleton with hosted-database guard |
| `lib/runtime-config.ts` | Origin resolution, Vercel environment detection |
| `lib/mfa.ts` | TOTP secret/QR generation, token verification |
| `lib/mfa-token.ts` | HMAC-signed short-lived MFA challenge tokens |
| `lib/rate-limit.ts` | In-memory rate limiter with IP extraction |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.ts` | Seed data (admin user, categories, tags, sample post) |
