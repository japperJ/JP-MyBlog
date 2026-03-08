# Getting Started with AI Coding Blog

This guide assumes the app lives at `upstream/JP-MyBlog/` inside the current workspace and is being prepared for Vercel Hobby preview/development use.

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

Set these values in `.env.local`:

```env
DATABASE_URL="postgresql://<external-postgres>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="replace-with-a-long-random-secret"
```

### What each variable does

- `DATABASE_URL` powers Prisma, content CRUD, sessions, and MFA-related persistence.
- `NEXT_PUBLIC_APP_URL` is the public origin used for metadata, sitemap, feed, and OG URLs.
- `MFA_TOKEN_SECRET` signs short-lived MFA challenge tokens and must stay stable in hosted environments.

## 4. Initialize the database once

This repo does not currently include checked-in Prisma migrations, so the smallest setup path is:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## 5. Start local development

```bash
npm run dev
```

Open:

- <http://localhost:3000>
- <http://localhost:3000/admin/login>

Default seeded admin account:

- Email: `admin@aicodingblog.com`
- Password: `admin123`

## 6. Understand the auth/session model

- The app uses a database-backed `auth_session` cookie.
- Cookies are host-only.
- Localhost sessions stay on localhost.
- Vercel preview sessions stay on the exact preview hostname that set them.
- You should expect to log in again on each preview URL.

## 7. Understand the upload policy

### Local workflow

When you are running outside Vercel-hosted infrastructure, `/api/upload` can still write to `public/uploads`.

### Hosted Vercel workflow

When the app is running on Vercel, uploads are disabled on purpose.

Use this instead:

1. Upload the image to an HTTPS-accessible host.
2. Copy the final `https://...` URL.
3. Paste that URL into the post editor's cover image field.

## 8. Connect Vercel

If this repository remains nested in the workspace, configure the Vercel project root as:

```text
upstream/JP-MyBlog/
```

Add the same runtime variables in Vercel Development and Preview:

```env
DATABASE_URL=postgresql://<external-provider>
NEXT_PUBLIC_APP_URL=https://<deployment-origin>
MFA_TOKEN_SECRET=<stable-long-random-secret>
```

For the first rollout, one free-tier PostgreSQL database is acceptable.

## 9. Run validations

Useful checks:

```bash
npx tsc --noEmit
npx prisma validate
npm run build
npm test
```

Notes:

- `prisma validate` needs `DATABASE_URL` to be set.
- `npm run build` and `npm test` need a reachable database because the app queries Prisma-backed content during runtime/build paths.

## 10. Troubleshooting

### `DATABASE_URL` errors

- Make sure the variable exists in `.env.local` or your shell.
- Hosted deployments cannot use `localhost` for Postgres.

### MFA works locally but not in hosted environments

- Ensure `MFA_TOKEN_SECRET` is explicitly set in Vercel.
- Do not rely on the local fallback secret in hosted runtimes.

### Preview login does not carry to another URL

- That is expected.
- Sessions are host-only and tied to the exact deployment origin.

### Uploads fail on Vercel

- That is expected for Phase 2.
- Use an external HTTPS image URL instead.
