# AI Coding Blog

A Next.js 15 + Prisma + PostgreSQL blog app prepared for a first Vercel Hobby preview/development rollout.

## Deployment contract

The repo now uses one explicit Phase 3 contract:

- **Workspace execution root:** `upstream/JP-MyBlog/`
- **Vercel project root:** `upstream/JP-MyBlog/`
- **Database:** one shared external free-tier PostgreSQL database for local development, Vercel Development, and Vercel Preview during the initial rollout
- **Auth/session model:** database-backed host-only `auth_session` cookies
- **Uploads on Vercel:** intentionally disabled until object storage is added
- **Readiness proof:** only truthful when the checks run against a real reachable external PostgreSQL database, and hosted smoke tests only pass when a real preview URL exists

If the external database or preview URL does not exist yet, the correct status is **blocked readiness**, not a soft pass.

## Environment variables

Copy the example file first:

```bash
cp .env.example .env.local
```

| Variable | Local | Vercel Development / Preview | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Required | Required | Shared external PostgreSQL connection for Prisma, sessions, MFA state, and content data |
| `NEXT_PUBLIC_APP_URL` | Required (`http://localhost:3000`) | Optional when relying on `VERCEL_URL` fallback; set only for a stable alias/custom domain | Public origin for metadata, sitemap, feed, and OG URLs in non-request contexts |
| `MFA_TOKEN_SECRET` | Recommended | Required | Stable secret for short-lived MFA challenge tokens |

Notes:

- Do **not** point hosted deployments at `localhost`.
- `NEXTAUTH_*` variables are not part of the active runtime contract.
- Host-only cookies mean sessions do not carry from localhost to Vercel, or between different preview URLs.

## One-time database initialization

This repo still ships without checked-in Prisma migrations. For the first rollout, initialize the shared database with:

```bash
cd upstream/JP-MyBlog
npm run db:generate
npm run db:push
npm run db:seed
```

Seeded admin account:

- Email: `admin@aicodingblog.com`
- Password: `admin123`

Use `db:seed` only when you want that default admin user and starter content.

## Local development

From the workspace root:

```bash
cd upstream/JP-MyBlog
npm install
cp .env.example .env.local
```

Set `.env.local`:

```env
DATABASE_URL="postgresql://<shared-external-provider>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="replace-with-a-long-random-secret"
```

Then run:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open:

- Blog: <http://localhost:3000>
- Admin login: <http://localhost:3000/admin/login>

## Vercel Hobby setup

When you create or link the Vercel project, keep the project root set to:

```text
upstream/JP-MyBlog/
```

Recommended first-rollout setup:

1. Create one shared external free-tier PostgreSQL database.
2. Add `DATABASE_URL` and `MFA_TOKEN_SECRET` to **Development** and **Preview**.
3. Leave `NEXT_PUBLIC_APP_URL` unset on Vercel if you want the app to use the deployment `VERCEL_URL` automatically.
4. Set `NEXT_PUBLIC_APP_URL` on Vercel only if you intentionally use a stable alias or custom domain for that environment.
5. Run `npm run db:push` once against the shared database.
6. Run `npm run db:seed` once if you want the default admin user.
7. Deploy the preview build.

## Truthful readiness gate

Run these commands from `upstream/JP-MyBlog/`.

### Required preflight

```bash
npm install
npm run typecheck
npm run db:validate
npm run db:generate
npm run db:push
npm run db:seed
npm run build
```

Interpretation:

- `npm run db:validate` is not meaningful without `DATABASE_URL`.
- `npm run build` is not a real pass unless the Prisma-backed pages can reach the external database.
- If the database is missing or unreachable, readiness is **blocked**.

### Required hosted smoke

```bash
PLAYWRIGHT_BASE_URL=https://<preview-url> PLAYWRIGHT_ADMIN_EMAIL=admin@aicodingblog.com PLAYWRIGHT_ADMIN_PASSWORD=admin123 npm run test:smoke:hosted
```

This smoke path covers the current deployment gate:

- health endpoint
- admin login and protected admin screens
- post/category/tag CRUD through the current API
- OG image generation
- hosted upload limitation messaging and hosted `/api/upload` failure behavior

`tests/blog.spec.ts` is intentionally **not** part of the Phase 3 readiness gate. That file is explicitly de-scoped until it is realigned to the current homepage/blog UI.

## Testing model

- `npm test` remains a broader developer command.
- `npm run test:smoke:hosted` is the truthful initial hosted readiness smoke gate.
- `npm run test:smoke:local` runs the same admin/API smoke flow against the local default server.
- Do not treat a generic `npm test` result as proof of first preview readiness when the required database or preview URL prerequisites are missing.

## Hosted upload limitation

`/api/upload` writes to local disk, so Vercel-hosted preview/development deployments intentionally reject uploads.

Hosted workflow:

1. Upload the image to any HTTPS-accessible image host.
2. Copy the final `https://...` URL.
3. Paste that URL into the post editor's cover image field.

## Session and origin behavior

- Local development should keep `NEXT_PUBLIC_APP_URL=http://localhost:3000`.
- Hosted preview/development can rely on `VERCEL_URL` fallback unless you pin a stable alias/custom domain.
- Metadata, feed, sitemap, and OG URLs follow the configured origin or request origin.
- Auth cookies are host-only, so every preview hostname is a separate login scope.

## Known limitations

- No checked-in Prisma migrations exist yet; first-rollout setup uses `prisma db push`.
- Vercel-hosted uploads are disabled until object storage is added.
- In-memory rate limiting is acceptable for preview/dev only.
- Final deployment readiness cannot be claimed without a real reachable external PostgreSQL database and a real preview URL for hosted smoke testing.

## Additional docs

- [`GETTING_STARTED.md`](./GETTING_STARTED.md)
- [`IMPLEMENTATION.md`](./IMPLEMENTATION.md)
