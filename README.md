# AI Coding Blog

A Next.js 15 + Prisma + PostgreSQL blog application.

## Quick start

```bash
git clone https://github.com/japperJ/JP-MyBlog.git
cd JP-MyBlog
npm install
cp .env.example .env.local   # then fill in your values
npm run db:push && npm run db:seed
npm run dev
```

Open <http://localhost:3000>. Admin login: <http://localhost:3000/admin/login> (`admin@aicodingblog.com` / `admin123` — change immediately).

## Environment variables

| Variable | Local | Vercel | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Required | Required | PostgreSQL connection string |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Optional (falls back to `VERCEL_URL`) | Canonical origin for metadata, sitemap, feed, OG |
| `MFA_TOKEN_SECRET` | Recommended | Required | Stable HMAC secret for MFA challenge tokens |

## Key commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run typecheck` | Prisma generate + tsc --noEmit |
| `npm run readiness:preflight` | typecheck, db:validate, db:generate, build |
| `npm run db:push` | Apply schema to database |
| `npm run db:seed` | Seed default admin + sample content |
| `npm run test:smoke:local` | Smoke tests against local server |
| `npm run test:smoke:hosted` | Smoke tests against a real preview URL |

## Vercel deployment

See [Deployment Procedure](./docs/admin/deployment.md) for the full guide. The short version:

1. Import the repo in [vercel.com/new](https://vercel.com/new).
2. Set `DATABASE_URL` and `MFA_TOKEN_SECRET` in Vercel environment variables.
3. Deploy. The build runs `prisma generate && next build` and requires a reachable database.

## Known limitations

- No checked-in Prisma migrations; setup uses `prisma db push`.
- Vercel-hosted uploads are disabled until object storage is added.
- In-memory rate limiting is acceptable for preview/dev only.
- Preview and production share one database during initial rollout.

## Documentation

### For users

- [**Getting Started**](./docs/user/getting-started.md) — clone, install, run locally in 5 minutes
- [**Writing Posts**](./docs/user/writing-posts.md) — create, edit, publish, and manage blog posts
- [**Customization**](./docs/user/customization.md) — site name, metadata, OG images, theme
- [**Troubleshooting**](./docs/user/troubleshooting.md) — symptom-based fixes

### For engineers

- [**Architecture**](./docs/technical/architecture.md) — system design, invariants, technology choices
- [**Auth System**](./docs/technical/auth-system.md) — session cookies, MFA/TOTP, middleware
- [**SEO Implementation**](./docs/technical/seo-implementation.md) — JSON-LD, ISR, sitemap, OG images
- [**Deployment Model**](./docs/technical/deployment-model.md) — Vercel Hobby constraints, env var contract, build pipeline

### For admins

- [**Deployment Procedure**](./docs/admin/deployment.md) — full setup with prerequisites, rollback, verification
- [**Database Operations**](./docs/admin/database-operations.md) — migrations, seed data, backup/restore
- [**Monitoring**](./docs/admin/monitoring.md) — health checks, alerts, incident response
