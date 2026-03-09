---
title: "Design Decisions"
description: "Architecture Decision Records — why every major technology choice was made, what was rejected, and what would break if reversed"
category: technical
created: 2025-07-26
updated: 2025-07-26
---

# Design Decisions

This document records every significant technology and architecture decision made in the project. Each entry follows an ADR (Architecture Decision Record) format: the choice, the rejected alternatives, and the specific failure case of each alternative.

> [!important] How to read this document
> Every entry answers "why this and not X?" If you're considering changing a decision, read the **Why not** section first — it describes the specific failure mode you'll encounter.

---

## ADR-001: Component Library — shadcn/ui {#component-library}

**Choice:** shadcn/ui (New York style) with Radix UI primitives and Tailwind CSS.

**Rejected alternatives:**
- Material UI (MUI)
- Chakra UI
- Hand-rolled components

**Why shadcn/ui:**

1. **Copy-paste ownership.** Components are copied into `components/ui/` — no `node_modules` dependency for UI code. You can modify any component without forking a library or waiting for upstream releases.
2. **Radix primitives for accessibility.** Sheet (mobile nav), Dialog (search), DropdownMenu, and other interactive components use Radix UI's accessible primitives. WAI-ARIA compliance without manual implementation.
3. **Full Tailwind integration.** All styling uses Tailwind utility classes. No CSS-in-JS runtime, no theme object juggling, no className/sx-prop confusion.
4. **Tree-shakeable by design.** Only the components you copy are in the bundle. No unused component code ships to the browser.

**Why not Material UI:** MUI uses Emotion (CSS-in-JS runtime), which conflicts with Tailwind's utility-first approach. The `sx` prop and theme system add abstraction layers that duplicate what Tailwind already provides. Bundle size is significantly larger for a blog that uses ~15 components.

**Why not Chakra UI:** Similar CSS-in-JS runtime overhead as MUI. Chakra's component API is opinionated about theming in ways that conflict with Tailwind's `dark:` variant and `next-themes` integration.

**Why not hand-rolled:** Building accessible Sheet, Dialog, and DropdownMenu components from scratch is a multi-week effort to match Radix's ARIA compliance. For a blog, this is unjustifiable.

**Affected files:** `components/ui/*`, `components.json`

---

## ADR-002: ORM — Prisma {#orm}

**Choice:** Prisma 5 with PostgreSQL.

**Rejected alternatives:**
- Drizzle ORM
- Raw SQL (pg/postgres.js)
- TypeORM

**Why Prisma:**

1. **Type-safe queries.** `prisma.post.findMany({ where: { published: true } })` generates TypeScript types from the schema. Typos in field names are compile-time errors.
2. **Schema-as-code.** `prisma/schema.prisma` is the single source of truth for the database. Models, relations, and indexes are declarative and version-controlled.
3. **Migration tooling.** `prisma db push` for development, `prisma migrate dev` when schema stabilizes. Both generate the DDL automatically.
4. **First-class Next.js support.** Prisma's global singleton pattern (`lib/prisma.ts`) handles HMR connection pooling. The Prisma team actively tests against Next.js.

**Why not Drizzle:** At the time of decision, Drizzle's relation API was less mature than Prisma's `include` syntax for eager-loading nested relations (e.g., `Post → PostCategory → Category`). The many-to-many junction table pattern used throughout the schema is simpler with Prisma's relation mapping.

**Why not raw SQL:** Type safety would require manual type definitions for every query result. Schema changes would require manual DDL. For 6 models with M2M relations, the maintenance burden exceeds Prisma's overhead.

**Why not TypeORM:** TypeORM's decorator-based entity definition doesn't integrate well with Next.js's compilation pipeline. Its query builder is more verbose than Prisma for common CRUD patterns.

**Affected files:** `prisma/schema.prisma`, `lib/prisma.ts`, all `app/api/*/route.ts` files

---

## ADR-003: Rendering Strategy — ISR with revalidate=60 {#rendering-strategy}

**Choice:** Incremental Static Regeneration with a 60-second revalidation window and `dynamicParams = true` for slug-based routes.

**Rejected alternatives:**
- Full SSR (no caching)
- Full SSG (build-time only)
- Client-side rendering (CSR)

**Why ISR at 60 seconds:**

1. **Content freshness without rebuild.** New or edited posts appear within 60 seconds. No redeployment needed.
2. **Cache performance.** Repeated requests within the 60s window are served from Vercel's CDN. Zero serverless function invocations, zero database queries.
3. **On-demand new slugs.** `dynamicParams = true` means post slugs created after the last build are rendered on first request and then cached.
4. **Explicit cache busting.** Admin CRUD calls `revalidatePath()` to immediately invalidate affected pages.

**Why not full SSR:** Every request would hit the serverless function and database. Neon's free tier has connection limits; aggressive request rates could exhaust them. TTFB would increase from ~50ms (cached) to 200–500ms (cold serverless + Neon cold start).

**Why not full SSG:** New posts would require a full rebuild and redeploy. A blog with frequent updates would need a webhook-triggered rebuild pipeline — more infrastructure for worse latency than ISR.

**Why not CSR:** Content wouldn't be indexable by search engines without additional SSR hydration. The entire point of a blog is SEO discoverability.

**Trade-off accepted:** ISR couples builds to database availability. A Neon outage during build time blocks deployment. This is acceptable because blog content is not time-critical — a few hours of deploy delay is not catastrophic.

**Affected files:** All `app/**/page.tsx` files (export `revalidate = 60`), admin API routes (call `revalidatePath()`)

See [[architecture#isr-strategy]] for the full route table.

---

## ADR-004: Auth — Custom Session + bcrypt {#auth}

**Choice:** Hand-rolled session-based auth with bcrypt password hashing, database-stored sessions, and a cookie transport layer.

**Rejected alternatives:**
- NextAuth.js (next-auth)
- better-auth
- Clerk (hosted auth)

**Why custom auth:**

1. **Full session lifecycle control.** The app needs `destroyOtherSessions()` after MFA changes — invalidating all sessions except the current one. This is a single Prisma query. With NextAuth, this requires custom adapter callbacks.
2. **No third-party dependency for core security.** Auth is the security perimeter. Depending on an external library for session management introduces a supply-chain risk surface that must be audited on every update.
3. **Edge middleware compatibility.** The middleware only checks cookie existence (no DB call). Custom auth makes this trivial. NextAuth's middleware integration expects specific session shapes and CSRF tokens.
4. **MFA integration.** TOTP with HMAC-signed challenge tokens is a custom flow. NextAuth has no built-in MFA support; bolting custom MFA onto NextAuth's callback chain is more complex than building the full auth stack.

**Why not NextAuth:** Complexity mismatch. NextAuth's provider abstraction, adapter system, and callback chains are designed for multi-provider OAuth flows. This app has one auth method (email/password) and one user role system. NextAuth's indirection adds debugging surface without adding capability.

**Why not better-auth:** Listed in `package.json` but **never imported or used**. The auth system was hand-rolled before better-auth was evaluated. Migrating would require rewriting the session model, MFA flow, and edge middleware — with no functional gain.

**Why not Clerk:** External service dependency. Adds latency to every auth check (network round-trip to Clerk's API). Not suitable for a self-hosted blog that should work without external service subscriptions.

> [!note] Legacy artifact
> `NEXTAUTH_*` environment variables in `.env.example` are from early development. They are not read by any code path.

**Affected files:** `lib/auth.ts`, `lib/mfa.ts`, `lib/mfa-token.ts`, `middleware.ts`, `app/admin/layout.tsx`

See [[auth-system]] for the full auth deep dive.

---

## ADR-005: MFA — TOTP with HMAC-signed Challenge Tokens {#mfa}

**Choice:** Time-based One-Time Password (TOTP) via `otplib`, with HMAC-SHA256 signed challenge tokens for the two-step login flow.

**Rejected alternatives:**
- WebAuthn (passkeys/hardware keys)
- SMS-based OTP

**Why TOTP + HMAC tokens:**

1. **Standard authenticator app.** Works with Google Authenticator, Authy, 1Password — no proprietary integration.
2. **No external service.** SMS requires a provider (Twilio, etc.). TOTP is self-contained.
3. **Stateless challenge.** The HMAC-signed `mfaToken` carries the user ID and expiry. No database write needed for the challenge step. This survives Vercel's stateless serverless model — the challenge token doesn't need to persist in memory between the login and verify requests.
4. **Timing-safe verification.** `crypto.timingSafeEqual` prevents timing attacks on token comparison.

**Why not WebAuthn:** Adds significant client-side complexity (browser credential API, attestation handling). For a single-admin blog, TOTP provides sufficient security with simpler implementation.

**Why not SMS:** Requires an external SMS provider, ongoing cost, and phone number management. SIM-swap attacks make SMS less secure than TOTP for determined attackers.

**Trade-off accepted:** TOTP requires users to install an authenticator app. This is a one-time setup cost that's acceptable for admin accounts.

**Affected files:** `lib/mfa.ts`, `lib/mfa-token.ts`, `app/api/auth/mfa/*/route.ts`

---

## ADR-006: Search — Server Action + Prisma contains {#search}

**Choice:** Server action (`searchPosts`) using Prisma `contains` + `mode: insensitive` for case-insensitive text matching.

**Rejected alternatives:**
- Algolia (hosted search)
- Meilisearch (self-hosted)
- PostgreSQL full-text search (`tsvector`/`tsquery`)

**Why Prisma contains:**

1. **Zero external dependencies.** No search service to provision, configure, or pay for.
2. **Adequate for volume.** The blog is expected to have <1000 posts. `ILIKE` queries on indexed text columns are fast at this scale.
3. **Simple implementation.** A single server action with a Prisma query. No indexing pipeline, no sync mechanism, no separate search infrastructure.

**Why not Algolia/Meilisearch:** External service dependency adds operational complexity (API keys, index syncing, billing). The marginal search quality improvement (fuzzy matching, typo tolerance) doesn't justify the cost for a personal blog.

**Why not PostgreSQL full-text search:** Despite `fullTextSearch` and `fullTextIndex` being enabled as Prisma preview features in the schema, full-text search requires `tsvector` column generation and `@@` query operators. The `contains` approach is simpler and works without schema changes. The preview features are enabled but **not used in any query** — this is intentional.

> [!note] Performance envelope
> `contains` + `mode: insensitive` translates to `ILIKE '%query%'` in PostgreSQL. This is a sequential scan — O(n) where n = total content size. For <1000 posts with typical blog content, this completes in <100ms. Beyond ~10,000 posts, consider migrating to full-text search or an external service.

**Affected files:** `app/actions/search.ts`, `components/search-dialog.tsx`

---

## ADR-007: Code Highlighting — CDN highlight.js + Theme Switching {#code-highlighting}

**Choice:** CDN-loaded highlight.js 11.9.0 with CSS `<link>` href swapping for theme switching.

**Rejected alternatives:**
- rehype-highlight (bundled in rehype pipeline)
- Shiki (server-side highlighting)
- Prism (bundled client-side)

**Why CDN highlight.js:**

1. **Zero bundle size impact.** highlight.js loads from `cdnjs.cloudflare.com`, not the application bundle. The client JS bundle stays small.
2. **Instant theme switching.** Changing the `<link>` href is a single DOM operation. The browser fetches the new stylesheet (typically cached by CDN) and re-paints. No React re-render, no JavaScript re-execution of highlighting logic.
3. **Auto-initialization.** highlight.js detects `language-*` CSS classes and highlights code blocks automatically on page load. No explicit initialization code needed.

**Why not rehype-highlight:** `rehype-highlight` is in `package.json` but is **not imported or used**. It applies highlighting during the rehype pipeline (server-side for SSR, client-side for hydration). Theme switching would require re-running the entire ReactMarkdown pipeline — expensive and causes visible re-render. The CDN approach avoids this entirely.

**Why not Shiki:** Shiki generates inline styles (not CSS classes), which makes theme switching require full re-highlighting. Server-side Shiki adds significant processing time per page render. For ISR-cached pages, this cost is amortized — but theme switching remains problematic.

**Why not Prism:** Similar trade-offs to bundled highlight.js. Adds to client bundle. Theme switching requires re-execution.

**Trade-off accepted:** The CDN dependency means code highlighting fails if `cdnjs.cloudflare.com` is unreachable. In practice, CDN uptime is >99.99%. Code blocks degrade gracefully to unstyled `<pre><code>` text.

**Affected files:** `app/layout.tsx` (`<link data-highlight-theme>`), `components/code-theme.tsx`, `components/blog/code-block.tsx`, `app/globals.css`

See [[markdown-pipeline]] for the full rendering chain.

---

## ADR-008: Edge Middleware — Cookie-Presence Only {#edge-middleware}

**Choice:** Edge middleware checks only for the existence of the `auth_session` cookie. No database calls, no self-fetch to API routes.

**Rejected alternatives:**
- Full session validation in middleware (via self-fetch to `/api/auth/session`)
- Token-based validation (JWT) at the edge

**Why cookie-presence only:**

1. **Avoids Vercel Hobby deadlock.** Self-fetch from Edge to Serverless causes a concurrency deadlock on Vercel Hobby tier. Edge occupies one execution slot while waiting for Serverless. Serverless can't start because the slot is taken. Both hang until the 10-second timeout.
2. **Full validation deferred to admin layout.** `app/admin/layout.tsx` runs in the Node.js runtime and calls Prisma directly — no HTTP round-trip, no concurrency conflict.

**Why not self-fetch:** Deadlocks on Vercel Hobby tier. Documented in `middleware.ts` lines 7–19. The symptom is admin pages hanging for exactly 10 seconds then returning 504.

**Why not JWT:** JWTs would allow session validation at the edge without a DB call. But JWTs can't be revoked server-side (without a revocation list, which requires a DB call). The app needs instant session invalidation after MFA changes (`destroyOtherSessions()`). Database-stored sessions provide this. Adding JWTs as a cache layer adds complexity without sufficient benefit for a single-instance blog.

**Affected files:** `middleware.ts`, `app/admin/layout.tsx`

See [[auth-system#the-self-fetch-deadlock-fix]] for the full failure analysis.

---

## ADR-009: Image Handling on Vercel — HTTPS URLs Only {#image-handling}

**Choice:** File uploads are disabled on Vercel. Cover images use external HTTPS URLs. The upload API returns 501 with a descriptive error.

**Rejected alternatives:**
- Vercel Blob Storage
- AWS S3 / Cloudflare R2
- Keep filesystem uploads on Vercel

**Why HTTPS URLs only:**

1. **Simplest for Hobby tier.** No additional service to provision or pay for. Authors paste an image URL from Unsplash, Imgur, or GitHub.
2. **No state to manage.** No blob storage credentials, no bucket configuration, no CORS policies.
3. **Clear failure mode.** `POST /api/upload` returns `501` with `"File uploads are disabled in hosted environments"`. Unambiguous.

**Why not Vercel Blob:** Adds a paid dependency (Blob is a Pro/Enterprise feature or requires separate billing). For a personal blog, this is overhead.

**Why not S3/R2:** Requires IAM credentials, bucket policies, and CORS configuration. Adds operational complexity for a feature (image uploads) that can be solved by pasting a URL.

**Why not filesystem on Vercel:** Vercel serverless functions run in ephemeral containers. Files written during a request are discarded on container recycle. `public/` is read-only after deploy.

**Trade-off accepted:** Authors must host images externally. This adds a step to the publishing workflow. Local development retains filesystem upload support for convenience.

**Affected files:** `lib/runtime-config.ts`, `app/api/upload/route.ts`

---

## ADR-010: Markdown Renderer — react-markdown + rehype Chain {#markdown-renderer}

**Choice:** `react-markdown` with remark-gfm, rehype-raw, rehype-sanitize, and rehype-slug plugins.

**Rejected alternatives:**
- MDX (next-mdx-remote / @next/mdx)
- Contentlayer
- unified pipeline directly (without react-markdown)

**Why react-markdown:**

1. **Runtime rendering from DB content.** Blog content is stored as Markdown strings in PostgreSQL, not as files on disk. `react-markdown` renders strings directly — no compile step needed.
2. **Plugin ecosystem.** remark-gfm for GFM, rehype-raw for HTML, rehype-sanitize for security, rehype-slug for TOC — all composable via the unified pipeline.
3. **Component overrides.** Custom `code` → `CodeBlock` and `a` → external link handler are first-class features of react-markdown's component mapping.
4. **Sanitization.** User-authored Markdown content rendered on a public page needs XSS protection. rehype-sanitize integrates naturally.

**Why not MDX:** MDX compiles Markdown-with-JSX to React components at build time (or via server-side compilation). Blog content is stored in the database and may be created/edited at any time. MDX compilation on every render adds latency and complexity. MDX also doesn't sanitize — it executes arbitrary JSX, which is a security risk for user-authored content.

**Why not Contentlayer:** Contentlayer is designed for file-based content (Markdown/MDX files in the repo). This blog stores content in PostgreSQL. Contentlayer's file-watching and compilation pipeline doesn't apply.

**Why not unified directly:** `react-markdown` wraps the unified pipeline and provides the component override API. Using unified directly would require manual hast-to-React conversion — extra code for no benefit.

**Affected files:** `components/blog/post-content.tsx`, `components/blog/code-block.tsx`

See [[markdown-pipeline]] for the complete pipeline documentation.

---

## ADR-011: Dark Mode — next-themes with class Strategy {#dark-mode}

**Choice:** `next-themes` with `attribute="class"` and `defaultTheme="dark"`.

**Rejected alternatives:**
- CSS `prefers-color-scheme` media query only
- Custom theme toggle implementation

**Why next-themes with class:**

1. **User preference persistence.** `next-themes` stores the chosen theme in `localStorage` and restores it on page load. CSS media queries alone can't persist a manual override.
2. **Tailwind `dark:` compatibility.** The `class` strategy adds/removes `class="dark"` on `<html>`. Tailwind's `dark:` variant uses this class directly — zero configuration.
3. **System preference support.** `enableSystem` respects `prefers-color-scheme` as the initial default while still allowing manual override.
4. **Flash prevention.** next-themes injects a blocking script to set the theme class before React hydrates, preventing the white flash on dark-mode page loads.

**Why not media query only:** Can't persist a user's manual theme choice across sessions. If a user prefers light mode on a dark-default blog, they'd have to switch every visit.

**Why not custom implementation:** next-themes solves flash prevention, system preference detection, and `localStorage` persistence in ~3KB. Reimplementing this is error-prone (especially the blocking script injection for SSR).

**Affected files:** `app/layout.tsx` (`ThemeProvider`), `components/navigation.tsx` (theme toggle), `components/code-theme.tsx` (reads `resolvedTheme`)

---

## Decision Index

| # | Decision | Choice | Key Rationale |
|---|---|---|---|
| ADR-001 | Component Library | shadcn/ui | Copy-paste ownership, Radix a11y, Tailwind integration |
| ADR-002 | ORM | Prisma | Type-safe queries, schema-as-code, Next.js support |
| ADR-003 | Rendering Strategy | ISR (revalidate=60) | Freshness + caching balance, no rebuild for new posts |
| ADR-004 | Auth | Custom session + bcrypt | Session lifecycle control, no third-party dependency |
| ADR-005 | MFA | TOTP + HMAC tokens | Standard authenticator, no external service, stateless challenge |
| ADR-006 | Search | Prisma `contains` | Zero deps, adequate for <1000 posts |
| ADR-007 | Code Highlighting | CDN highlight.js | Zero bundle, instant theme switch, no re-render |
| ADR-008 | Edge Middleware | Cookie-presence only | Avoids Vercel Hobby deadlock |
| ADR-009 | Image Handling | HTTPS URLs only | Simplest for Hobby tier, no state to manage |
| ADR-010 | Markdown Renderer | react-markdown + rehype | Runtime DB rendering, sanitization, plugin ecosystem |
| ADR-011 | Dark Mode | next-themes (class) | Persists choice, Tailwind compatible, flash prevention |

---

## Related Documentation

- [[architecture]] — System structure affected by these decisions
- [[markdown-pipeline]] — ADR-007 and ADR-010 in implementation detail
- [[auth-system]] — ADR-004, ADR-005, and ADR-008 in implementation detail
- [[api-reference]] — API contracts shaped by auth and rendering decisions
