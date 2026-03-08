# Implementation Notes

## Phase 3 operating target

The app is being finalized for:

- local development from `upstream/JP-MyBlog/`
- Vercel Development
- Vercel Hobby Preview

The deployment root stays `upstream/JP-MyBlog/`.

## Final first-rollout workflow

### 1. Shared infrastructure contract

The initial rollout uses one shared external free-tier PostgreSQL database across:

- local development
- Vercel Development
- Vercel Preview

This is a deliberate first-rollout compromise. It keeps setup simple, but it also means preview and development data are shared until a later hardening phase introduces stronger environment separation.

### 2. One-time bootstrap sequence

Run from `upstream/JP-MyBlog/`:

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

This sequence is required before a truthful first preview rollout because the app builds and renders Prisma-backed content during build/runtime paths.

### 3. Preflight sequence before claiming readiness

Run from `upstream/JP-MyBlog/`:

```bash
npm run typecheck
npm run db:validate
npm run db:generate
npm run build
```

Interpret the results strictly:

- `typecheck` proves TypeScript compatibility only.
- `db:validate` proves the Prisma schema can load against the configured `DATABASE_URL`.
- `build` is only meaningful when the external database is reachable because homepage/blog pages query Prisma during build.
- If the database is unavailable, the result is **blocked readiness**.

### 4. First preview deployment sequence

1. Point the Vercel project root at `upstream/JP-MyBlog/`.
2. Add `DATABASE_URL` and `MFA_TOKEN_SECRET` to Vercel Development and Preview.
3. Leave `NEXT_PUBLIC_APP_URL` unset on Vercel by default so runtime helpers can use `VERCEL_URL`.
4. Set `NEXT_PUBLIC_APP_URL` only when you intentionally want a stable alias/custom domain.
5. Ensure the shared database has already been pushed and seeded.
6. Deploy the preview build.

### 5. Hosted smoke validation sequence

After the preview URL exists, run:

```bash
PLAYWRIGHT_BASE_URL=https://<preview-url> PLAYWRIGHT_ADMIN_EMAIL=admin@aicodingblog.com PLAYWRIGHT_ADMIN_PASSWORD=admin123 npm run test:smoke:hosted
```

This is the current truthful smoke gate because it exercises:

- `/api/health`
- admin login and protected pages
- post/category/tag CRUD behavior
- OG image generation
- hosted upload limitation messaging and hosted upload failure behavior

## Runtime contracts

### Database contract

- `DATABASE_URL` is mandatory.
- Hosted deployments must use a real external PostgreSQL database.
- `localhost` is never a valid hosted database target.

### Origin contract

- Local development should keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- Hosted preview/development can rely on `VERCEL_URL` fallback when no stable alias exists.
- Metadata, feed, sitemap, canonical URLs, and OG URLs all follow that same origin strategy.

### Session contract

- The app uses a database-backed `auth_session` cookie.
- Cookies are host-only and same-origin.
- Each preview hostname is its own login scope.

### MFA contract

- `MFA_TOKEN_SECRET` is required for hosted deployments.
- It should stay stable across redeploys in the same environment.

### Upload contract

- Local/non-Vercel flows may still write to `public/uploads`.
- Vercel-hosted flows intentionally fail closed at `/api/upload`.
- Editors should use external HTTPS image URLs on Vercel.

## Readiness gate definition

### Gating checks

- `npm install`
- `npm run typecheck`
- `npm run db:validate`
- `npm run db:generate`
- `npm run db:push`
- `npm run db:seed`
- `npm run build`
- `npm run test:smoke:hosted` against a real preview URL

### Non-gating / explicitly de-scoped

- `tests/blog.spec.ts`
  - Phase 3 status: **de-scoped from deployment readiness**
  - Why: it still needs to be realigned to the current homepage/blog UI before it can serve as a truthful release signal

## Known limitations and non-goals

These are still intentionally out of scope for the first rollout:

- object storage for hosted uploads
- checked-in Prisma migrations
- production-grade distributed rate limiting
- separate databases per environment
- session sharing across preview hosts

## Truthfulness requirement

The project should only be described as ready for first preview deployment when both of these are true:

1. the preflight sequence succeeded against a real reachable external PostgreSQL database
2. the hosted smoke sequence succeeded against a real preview URL

If either prerequisite is missing, the correct verdict is blocked by external prerequisites rather than ready.

## Planning-environment note

No SQL tool was available in the planning environment used for this phase, so SQL-specific todos were not updated and no direct SQL inspection was performed here.
