# Getting Started with AI Coding Blog

This guide assumes the app stays nested at `upstream/JP-MyBlog/` and that the same shared external PostgreSQL database is used for local development, Vercel Development, and Vercel Preview during the first rollout.

## 1. Move into the app root

From the workspace root:

```bash
cd upstream/JP-MyBlog
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Set `.env.local`:

```env
DATABASE_URL="postgresql://<shared-external-provider>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="replace-with-a-long-random-secret"
```

What each variable does:

- `DATABASE_URL` powers Prisma, content queries, session persistence, and MFA-related state.
- `NEXT_PUBLIC_APP_URL` should stay explicit for local development.
- `MFA_TOKEN_SECRET` should be stable anywhere you may run multiple server instances or redeploy frequently.

## 4. Initialize the shared database

This repo does not currently include checked-in Prisma migrations, so the one-time bootstrap path is:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

What this means:

- `db:generate` refreshes the Prisma client.
- `db:push` applies the current schema to the shared database.
- `db:seed` creates the default admin user plus starter categories, tags, and a sample post.

Seeded admin account:

- Email: `admin@aicodingblog.com`
- Password: `admin123`

## 5. Run the repeatable readiness preflight

Before claiming the app is ready beyond bootstrap, run:

```bash
npm run readiness:preflight
```

What `readiness:preflight` covers:

- `npm run typecheck`
- `npm run db:validate`
- `npm run db:generate`
- `npm run build`

Important:

- `npm run db:validate` and `npm run build` both depend on a real reachable external PostgreSQL database.
- This repeatable preflight does **not** replace the one-time bootstrap commands in Step 4.
- This repeatable preflight does **not** replace hosted smoke against a real preview URL.
- If the database is down, blocked by network rules, or misconfigured, the correct result is **blocked readiness**.

## 6. Start local development

```bash
npm run dev
```

Open:

- <http://localhost:3000>
- <http://localhost:3000/admin/login>

## 7. Understand local vs hosted origin handling

### Local

Use:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

This keeps metadata, feed, sitemap, and OG URLs consistent with localhost.

### Vercel Development / Preview

Use the same `DATABASE_URL` and `MFA_TOKEN_SECRET`, but choose one of these origin strategies:

1. **Default:** leave `NEXT_PUBLIC_APP_URL` unset and let the app fall back to `VERCEL_URL`.
2. **Explicit:** set `NEXT_PUBLIC_APP_URL` only if you have a stable alias or custom domain for that environment.

Do not set `NEXT_PUBLIC_APP_URL` to a stale preview hostname.

## 8. Understand the session model

- The app uses a database-backed `auth_session` cookie.
- Cookies are host-only.
- Localhost sessions stay on localhost.
- Each preview hostname has its own login scope.
- You should expect to log in again when the preview URL changes.

## 9. Understand the hosted upload policy

### Local / non-Vercel workflow

`/api/upload` can still write to `public/uploads`.

### Vercel-hosted workflow

Uploads are intentionally disabled.

Use this instead:

1. Upload the image to an HTTPS-accessible host.
2. Copy the final `https://...` URL.
3. Paste that URL into the post editor's cover image field.

## 10. Connect Vercel

Keep the Vercel project root set to:

```text
upstream/JP-MyBlog/
```

For the first rollout, configure **Development** and **Preview** with:

```env
DATABASE_URL=postgresql://<shared-external-provider>
MFA_TOKEN_SECRET=<stable-long-random-secret>
```

Optional on Vercel:

```env
NEXT_PUBLIC_APP_URL=https://<stable-alias-or-custom-domain>
```

If you do not have a stable alias/custom domain yet, leave `NEXT_PUBLIC_APP_URL` unset on Vercel and rely on the existing `VERCEL_URL` fallback.

## 11. Run the truthful hosted smoke path

After the first preview deploy exists and the seeded admin account is available, run:

```bash
PLAYWRIGHT_BASE_URL=https://<preview-url> PLAYWRIGHT_ADMIN_EMAIL=admin@aicodingblog.com PLAYWRIGHT_ADMIN_PASSWORD=admin123 npm run test:smoke:hosted
```

Important:

- `npm run test:smoke:hosted` hard-requires `PLAYWRIGHT_BASE_URL`.
- `PLAYWRIGHT_BASE_URL` must point to a real hosted deployment URL.
- Localhost-style URLs are rejected on purpose so hosted smoke cannot silently become local smoke.
- Use `npm run test:smoke:local` when you intentionally want the same smoke path against a local server.

This is the initial rollout smoke gate. It targets current admin/API behavior, not stale homepage/blog expectations.

Current hosted smoke coverage:

- health endpoint
- admin login and protected admin screens
- post/category/tag CRUD through the current API, including tag update
- OG image generation
- hosted upload limitation messaging and hosted `/api/upload` failure behavior

## 12. Know what is not a readiness gate

`tests/blog.spec.ts` is explicitly de-scoped from Phase 3 deployment readiness because it does not yet represent the current homepage/blog UI.

That means:

- `npm test` is still useful for developer workflows.
- `npm test` is **not** the authoritative deploy gate for the first preview rollout.
- The authoritative gate is: Step 4 bootstrap, then Step 5 `npm run readiness:preflight`, then Step 11 hosted smoke.

## 13. Troubleshooting

### `DATABASE_URL` errors

- Make sure the variable exists in `.env.local` or the Vercel project environment.
- Hosted deployments cannot use `localhost` for Postgres.
- A missing or unreachable database means readiness is blocked.

### MFA works locally but not in hosted environments

- Ensure `MFA_TOKEN_SECRET` is explicitly set in Vercel.
- Do not rely on a startup-generated fallback secret in hosted runtimes.

### Preview login does not carry to another URL

- That is expected.
- Sessions are host-only and tied to the exact deployment origin.

### Uploads fail on Vercel

- That is expected for the current rollout.
- Use an external HTTPS image URL instead.
