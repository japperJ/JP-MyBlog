# AI Coding Blog

A Next.js 15 + Prisma + PostgreSQL blog app prepared for Vercel Hobby preview and development deployments.

## Phase 2 Vercel model

This repository is currently aligned around a simple first-rollout contract:

- **Execution root:** `upstream/JP-MyBlog/` from the workspace root.
- **Database:** one external PostgreSQL database, shared across local development, Vercel Development, and Vercel Preview.
- **Auth:** database-backed sessions with a host-only `auth_session` cookie.
- **MFA:** `MFA_TOKEN_SECRET` must be set in every hosted environment.
- **Uploads:** filesystem uploads are **disabled on Vercel-hosted deployments**. Use external `https://` image URLs in the editor for hosted preview/development.
- **URLs:** metadata, sitemap, feed, and OG image output are derived from `NEXT_PUBLIC_APP_URL` and request origin handling instead of hardcoded domains.

## Required environment variables

Copy the example file and set these values:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | External PostgreSQL connection string used by Prisma, auth sessions, MFA persistence, and content APIs |
| `NEXT_PUBLIC_APP_URL` | Yes | Public origin for metadata, feed, sitemap, and OG URLs |
| `MFA_TOKEN_SECRET` | Yes for hosted envs | Stable secret for MFA challenge signing across instances |

Notes:

- `NEXTAUTH_*` variables are **not** part of the active runtime contract.
- Auth cookies are host-only by design. Sessions do **not** carry between localhost and Vercel, or between two different preview URLs.

## Local development

From the workspace root:

```bash
cd upstream/JP-MyBlog
npm install
cp .env.example .env.local
```

Set `.env.local` to your external Postgres database and local app URL:

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="replace-with-a-long-random-secret"
```

Initialize the database once:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Open:

- Blog: <http://localhost:3000>
- Admin login: <http://localhost:3000/admin/login>

Seeded admin credentials:

- Email: `admin@aicodingblog.com`
- Password: `admin123`

## Vercel Hobby preview and development setup

If this project stays nested in the current workspace, point the Vercel project root at:

```text
upstream/JP-MyBlog/
```

Configure the same core variables in Vercel for Development and Preview:

```env
DATABASE_URL=postgresql://<external-provider>
NEXT_PUBLIC_APP_URL=https://<that-environment-origin>
MFA_TOKEN_SECRET=<stable-long-random-secret>
```

Recommended first-rollout behavior:

1. Use one external free-tier PostgreSQL database.
2. Run schema initialization once with `npm run db:push` from a trusted local machine or CI job.
3. Run `npm run db:seed` once if you want the default admin user.
4. Log in separately on each preview hostname as needed.

### Hosted upload policy

`/api/upload` writes to local disk, so it is intentionally disabled on Vercel-hosted deployments.

Use this workflow instead:

1. Upload your image to any HTTPS-accessible image host.
2. Copy the final `https://...` URL.
3. Paste that URL into the post editor's cover image field.

Local filesystem uploads remain available only in local or non-Vercel workflows.

## Testing

Playwright is now environment-driven.

### Run against a local server

```bash
npm test
```

This starts a local dev server on `127.0.0.1:3000` by default.

### Run against an existing hosted deployment

```bash
PLAYWRIGHT_BASE_URL=https://your-preview-url.vercel.app npm test
```

Optional test env vars:

```env
PLAYWRIGHT_ADMIN_EMAIL=admin@aicodingblog.com
PLAYWRIGHT_ADMIN_PASSWORD=admin123
```

The admin and API tests assume:

- the database is initialized,
- the seed user exists,
- MFA is not enabled for the test admin account,
- hosted uploads are described as disabled in the UI.

## Useful commands

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run db:studio
npm run build
npm run test
```

## Known limitations

- No checked-in Prisma migrations exist yet; the current setup uses `prisma db push` for the first rollout.
- Vercel-hosted uploads are disabled until object storage is added.
- In-memory rate limiting is acceptable for preview/dev, but it is not a cross-instance protection layer.

## Additional docs

- [`GETTING_STARTED.md`](./GETTING_STARTED.md)
- [`IMPLEMENTATION.md`](./IMPLEMENTATION.md)
