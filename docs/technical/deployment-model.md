---
title: "Deployment Model"
description: "Vercel Hobby tier constraints, environment variables, build pipeline, database provisioning, and deployment verification"
category: technical
created: 2025-01-15
updated: 2025-07-26
---

# Deployment Model

## Invariants

> [!important] Deployment contracts
> These must hold for any deployment to succeed.

1. The Vercel Hobby tier imposes a **10-second function timeout** and **no persistent filesystem**.
2. All environment variables required at build time must be set in the Vercel dashboard before deploying.
3. The build command is `prisma generate && next build` — it requires a reachable database because pages query Prisma during static generation.
4. Preview and production deployments share the same database during the initial rollout. This is a deliberate simplification, not an oversight.

## Vercel Hobby tier constraints

| Constraint | Value | Impact on this app |
|-----------|-------|-------------------|
| Function execution timeout | 10 seconds | Long database queries or cold starts on Neon free tier must complete within this window |
| Concurrent executions | 1 (Edge + Serverless share pool) | Self-fetch from middleware causes deadlock — this is why middleware only checks cookies |
| Filesystem | Read-only after deploy | File uploads disabled; `/api/upload` returns 501 on Vercel |
| Build timeout | 45 minutes | Not a practical concern for this project |
| Bandwidth | 100 GB/month | Sufficient for a personal blog |
| Serverless functions | 12 per deployment (bundled) | All API routes and pages share this budget |
| ISR revalidation | Supported | Used with `revalidate = 60` on all public pages |

## Environment variable contract

### Required

> [!danger] Missing env vars cause build failures or runtime errors
> Both `DATABASE_URL` and `MFA_TOKEN_SECRET` must be set in the Vercel dashboard before deploying. Without them, the build fails or MFA login breaks.

| Variable | When needed | Purpose |
|----------|------------|---------|
| `DATABASE_URL` | Build + Runtime | PostgreSQL connection string. Must be an external host (not `localhost`) on Vercel. Used by Prisma for all database operations including static page generation at build time. |
| `MFA_TOKEN_SECRET` | Runtime | Stable HMAC secret for signing MFA challenge tokens. Must persist across redeploys so that a login started before a deploy can complete MFA verification after. |

### Optional

| Variable | When needed | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_APP_URL` | Build + Runtime | Canonical origin for metadata, sitemap, feed, and OG URLs. If unset, falls back to `VERCEL_URL` (auto-set by Vercel). Set this only when you have a stable alias or custom domain. |

### Auto-set by Vercel

| Variable | Value | Used by |
|----------|-------|---------|
| `VERCEL` | `"1"` | `lib/prisma.ts` (database guard), `lib/runtime-config.ts` (upload gating), `lib/mfa-token.ts` (secret requirement) |
| `VERCEL_URL` | Deployment URL (no protocol) | `lib/runtime-config.ts` (origin fallback when `NEXT_PUBLIC_APP_URL` is unset) |

### Origin resolution priority

`getConfiguredAppOrigin()` in `lib/runtime-config.ts` resolves the app's origin in this order:

1. `NEXT_PUBLIC_APP_URL` (if set) → normalize to origin
2. `VERCEL_URL` (if set) → prepend `https://`, normalize
3. `http://localhost:3000` (fallback)

## Database provisioning

### Neon free tier (recommended)

1. Create an account at [neon.tech](https://neon.tech).
2. Create a new project (choose a region close to your Vercel deployment region for lowest latency).
3. Copy the connection string from the Neon dashboard.
4. The connection string includes SSL by default (`?sslmode=require`).

**Neon-specific behaviors:**

> [!note] Neon cold start
> Free tier databases auto-suspend after 5 minutes of inactivity. First request after suspension takes 2–5 seconds, which counts against Vercel's 10-second function timeout.

- Free tier databases auto-suspend after 5 minutes of inactivity.
- First request after suspension takes 2–5 seconds (cold start).
- This cold start counts against Vercel's 10-second function timeout.
- Connection pooling is enabled by default on Neon.

### Database guard

`lib/prisma.ts` enforces that Vercel deployments use an external database:

```typescript
function assertHostedDatabaseContract(databaseUrl: string) {
  // On Vercel, reject localhost/127.0.0.1/::1 database URLs
  if (isVercelHosted && LOCAL_DATABASE_HOSTNAMES.has(hostname)) {
    throw new Error("Vercel-hosted deployments require an external PostgreSQL DATABASE_URL.");
  }
}
```

This runs at module load time. A misconfigured `DATABASE_URL` fails fast instead of producing cryptic runtime errors.

## Build pipeline

### Build command

```bash
prisma generate && next build
```

This is defined in `package.json` as the `build` script.

### Build steps

1. **`prisma generate`** — generates the Prisma Client from `prisma/schema.prisma`. This must run before `next build` because page components import from `@prisma/client`.
2. **`next build`** — compiles the Next.js app. During this step:
   - Static pages are generated (homepage, blog listing, individual posts).
   - Each static page queries the database via Prisma. **The database must be reachable at build time.**
   - `generateStaticParams()` in `app/blog/[slug]/page.tsx` fetches all published post slugs for pre-rendering.
   - API routes are bundled as serverless functions.
   - The OG image route is bundled as an Edge function.

### Why the database is needed at build time

The homepage (`app/page.tsx`) and blog pages query Prisma for featured/latest/published posts during static generation. Without a reachable database, `next build` fails with a Prisma connection error.

**Trade-off:** This couples the build to database availability, which means a Neon outage blocks deploys. The alternative (fully dynamic rendering with no static generation) would increase TTFB and database load for every request. ISR with build-time generation is the better trade-off for a blog.

## Preview vs production

### Preview deployments

- Triggered by every push to a non-production branch (or every push to `main` if no production branch is configured).
- Get a unique URL like `jp-my-blog-{hash}-japperj.vercel.app`.
- Use environment variables scoped to the **Preview** environment in Vercel.
- Auth cookies are host-only, so each preview URL is an isolated login scope.

### Production deployments

- Triggered by pushes to the production branch (typically `main`).
- Get the stable URL `jp-my-blog.vercel.app` (or your custom domain).
- Use environment variables scoped to the **Production** environment in Vercel.

### Current state (initial rollout)

Both preview and production share the same `DATABASE_URL` — this is documented as a deliberate first-rollout simplification. Consequences:

- Posts created in one environment are visible in the other.
- Running the seed script in one environment affects the other.
- A future hardening phase should introduce separate databases per environment.

## First deploy sequence

1. Fork/push the repo to GitHub.
2. Import the repo in the Vercel dashboard.
3. Set `DATABASE_URL` and `MFA_TOKEN_SECRET` in Vercel environment variables (for Preview and/or Production).
4. Run the database bootstrap locally or via Neon's SQL editor:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```
5. Trigger the first deploy (Vercel auto-deploys on import if the repo has code).
6. Verify the deployment at the preview URL.

## Verification

### Repeatable preflight

```bash
npm run readiness:preflight
```

Runs: `typecheck` → `db:validate` → `db:generate` → `build`

This proves the code compiles, the schema is valid, and the build succeeds against the configured database. It does not prove the hosted deployment works.

### Hosted smoke tests

```bash
PLAYWRIGHT_BASE_URL=https://<preview-url> \
PLAYWRIGHT_ADMIN_EMAIL=admin@aicodingblog.com \
PLAYWRIGHT_ADMIN_PASSWORD=admin123 \
npm run test:smoke:hosted
```

Covers: health endpoint, admin login, post/category/tag CRUD, OG image generation, upload limitation messaging.

## Known failure modes

| Symptom | Root cause | Detection | Recovery |
|---------|-----------|-----------|----------|
| Build fails with "DATABASE_URL is required" | Env var not set in Vercel | Vercel build logs | Add `DATABASE_URL` to Vercel environment variables |
| Build fails with Prisma connection error | Database unreachable (Neon suspended, wrong URL) | Build logs show connection timeout | Wake the database (visit Neon dashboard), verify URL |
| Pages hang for 10s then 504 | Self-fetch in middleware | Vercel function logs | Ensure middleware only checks cookies (see `middleware.ts`) |
| First request slow (2–5s) after inactivity | Neon cold start | Vercel function duration metrics | Upgrade Neon plan or accept cold start latency |
| Upload returns 501 | Expected behavior on Vercel | N/A | Use external image URLs |

## Related Documentation

- [[architecture]] — System architecture and ISR strategy
- [[api-reference]] — API routes and their auth requirements
- [[design-decisions#rendering-strategy]] — Why ISR over SSR/SSG/CSR
- [[design-decisions#image-handling]] — Why HTTPS URLs only on Vercel
