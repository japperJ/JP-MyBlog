---
title: "Deployment & Operations"
description: "Deploy the blog to Vercel with PostgreSQL, configure environment variables, set up a custom domain, and roll back safely"
category: admin
created: 2025-01-15
updated: 2025-01-15
---

# Deployment & Operations

> [!info] Prerequisites
> - **Vercel account** — Hobby tier (free) is sufficient
> - **GitHub account** — repository forked or pushed
> - **PostgreSQL database** — Neon free tier recommended (or any hosted PostgreSQL with SSL)
> - **Node.js 18+** and npm installed locally
> - **Repository cloned** with `npm install` completed

> [!danger] Blast radius
> This procedure creates a **public website**. The seed script creates a well-known admin account (`admin@aicodingblog.com` / `admin123`). Change the password immediately after first login. Anyone who finds the URL can read the blog; anyone who knows the default password can modify it.

**Time estimate:** ~30 minutes for initial setup. Subsequent deploys are automatic via Git push (~60–90 seconds build time).

**Impact scope:** Creates a production deployment accessible to the public internet. Affects: Vercel project, Neon database, DNS (if custom domain).

---

## Rollback

> [!warning] Read this before starting
> Know the escape hatch for every stage before you begin.

| Stage | Rollback Action | Time |
|-------|----------------|------|
| Database schema pushed | Drop and recreate the Neon database from the dashboard, or run `npx prisma db push --force-reset` (destroys all data) | 1 min |
| Database seeded | Delete records via Prisma Studio (`npm run db:studio`) or drop/recreate the database | 2 min |
| Vercel project created | Delete the project: Vercel Dashboard → Settings → General → **Delete Project** | 30 sec |
| Vercel deployment live | **Instant rollback:** Vercel Dashboard → Deployments → click any previous successful deployment → **Promote to Production** | 10 sec |
| Environment variables set | Remove from Vercel Dashboard → Settings → Environment Variables | 30 sec |
| Custom domain configured | Remove in Vercel Dashboard → Settings → Domains → Remove | 30 sec |

---

## Environment Variables

All environment variables used by the application:

### Required — You Must Set These

| Variable | Where to Set | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | `.env.local` (local) + Vercel Dashboard | PostgreSQL connection string |
| `MFA_TOKEN_SECRET` | Vercel Dashboard only (auto-generated locally) | HMAC-SHA256 signing secret for MFA challenge tokens |

> [!danger] `DATABASE_URL` — Required Always
> **Format:** `postgresql://user:pass@host:5432/dbname?sslmode=require`
>
> Must be an external hosted database on Vercel (not `localhost`). Without this, the app cannot start — builds will fail with `"DATABASE_URL is required"`.
>
> **Example:**
> ```
> postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
> ```

> [!danger] `MFA_TOKEN_SECRET` — Required on Vercel
> A stable string (≥32 characters) used to sign MFA challenge tokens with HMAC-SHA256. **Must persist across redeploys** — if this changes, all in-flight MFA login attempts will fail with a 500 error.
>
> Locally, this is auto-generated per process by `lib/mfa-token.ts`. On Vercel you must set it explicitly because serverless functions restart between invocations.
>
> **Generate one:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Recommended — Set for Production

| Variable | Where to Set | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_APP_URL` | Vercel Dashboard | Canonical origin URL (e.g., `https://myblog.com`) |

> [!warning] `NEXT_PUBLIC_APP_URL`
> Falls back to `VERCEL_URL` (auto-set), then `http://localhost:3000`. Used for:
> - `<meta>` tags and OpenGraph images
> - RSS feed `<link>` URLs
> - `sitemap.xml` page URLs
> - Canonical `<link>` tags
>
> If you use a **custom domain**, set this to your domain origin (e.g., `https://myblog.com`). Otherwise, OG images and RSS will reference the `.vercel.app` URL.

### Auto-Set by Vercel — Do Not Configure Manually

| Variable | Value on Vercel | Effect |
|----------|----------------|--------|
| `VERCEL` | `"1"` | Disables filesystem uploads (returns 501), enforces external DB detection |
| `VERCEL_URL` | `your-project.vercel.app` | Fallback for `NEXT_PUBLIC_APP_URL` (no protocol prefix) |
| `NODE_ENV` | `"production"` | Sets cookie `secure` flag to `true`, enables Prisma global singleton caching, disables verbose Prisma query logging |

---

## Procedure

### Step 1: Provision the PostgreSQL database

**Time estimate:** 3 minutes

> [!tip] Neon free tier
> [neon.tech](https://neon.tech) provides a free PostgreSQL database with SSL, branching, and auto-suspend. Choose a region close to your Vercel deployment (e.g., `us-east-1`).

1. Create a Neon project and database.
2. Copy the connection string from the Neon dashboard. It looks like:
   ```
   postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. **Verify:** Open the Neon SQL editor and run:
   ```sql
   SELECT 1;
   ```
   **Expected output:** A result of `1`.

### Step 2: Configure local environment

**Time estimate:** 2 minutes

1. Copy the example env file:
   ```bash
   cp .env.example .env.local
   ```
2. Edit `.env.local` with your values:
   ```env
   DATABASE_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   MFA_TOKEN_SECRET="generate-a-random-string-at-least-32-characters"
   ```
3. **Verify:** Open the file and confirm all three variables are set with real values, not placeholders.

   **Expected output:** Three non-empty environment variable assignments.

### Step 3: Bootstrap the database

**Time estimate:** 2 minutes

> [!caution] Safety gate
> `db:push` modifies the database schema directly. If the database already has tables, it may alter or drop columns. Run only on a **fresh database** for initial setup.

1. Generate the Prisma client:
   ```bash
   npm run db:generate
   ```
   **Expected output:** `✔ Generated Prisma Client`

2. Push the schema to the database:
   ```bash
   npm run db:push
   ```
   **Expected output:** `Your database is now in sync with your Prisma schema.`

3. Seed with initial data:
   ```bash
   npm run db:seed
   ```
   **Expected output:**
   ```
   Created admin user: admin@aicodingblog.com
   Database seeded successfully!
   ```

### Step 4: Verify local build

**Time estimate:** 3 minutes

```bash
npm run readiness:preflight
```

This runs: `typecheck` → `db:validate` → `db:generate` → `build` (`prisma generate && next build`).

**Expected output:** All four stages pass. Build output shows pages generated for `/`, `/blog`, and individual post slugs.

If it fails → see [[troubleshooting-runbook#Build Failures]].

### Step 5: Create the Vercel project

**Time estimate:** 3 minutes

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. **Framework Preset:** Next.js (auto-detected).
4. **Root Directory:** If the repo uses a monorepo layout with the app at `upstream/JP-MyBlog/`, set the root directory to `upstream/JP-MyBlog`.
5. **Do not deploy yet** — add environment variables first (Step 6).

### Step 6: Set Vercel environment variables

Navigate to: Vercel Dashboard → your project → **Settings** → **Environment Variables**.

| Variable | Value | Environments |
|----------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Production, Preview |
| `MFA_TOKEN_SECRET` | A stable ≥32-character random string | Production, Preview |

Leave `NEXT_PUBLIC_APP_URL` **unset** unless you have a custom domain — the app falls back to `VERCEL_URL` automatically.

**Verify:** Both variables appear in the table with masked values.

### Step 7: Deploy

1. Click **Deploy** (or push a commit to trigger auto-deploy).
2. Watch the build logs:
   - `prisma db push` syncs the database schema automatically
   - `prisma generate` regenerates the Prisma client
   - `next build` compiles and pre-renders pages
3. The deployment URL appears when the build completes.

**Expected output:** A live URL like `https://your-project.vercel.app`.

### Step 8: Verify the deployment

| Check | URL / Action | Expected Result |
|-------|-------------|----------------|
| Homepage loads | `/` | Blog homepage with the sample post |
| Health endpoint | `/api/health` | `{"status":"ok"}` |
| Admin login page | `/admin/login` | Login form renders |
| Admin access | Log in with `admin@aicodingblog.com` / `admin123` | Admin dashboard loads |
| OG image | `/api/og?title=Test` | A gradient image with "Test" title |
| Sitemap | `/sitemap.xml` | Valid XML with post and category URLs |
| RSS feed | `/feed.xml` | Valid RSS 2.0 XML |
| Robots | `/robots.txt` | Disallows `/admin/` and `/api/auth/` |

### Step 9: Change the default password

> [!danger] Security gate — do this immediately
> The default credentials (`admin@aicodingblog.com` / `admin123`) are public knowledge. Any delay creates a window of vulnerability.

1. Log in at `/admin/login` with the default credentials.
2. Navigate to **Settings** to update your password.
3. **Verify:** Log out and log back in with the new password.

---

## Custom Domain Configuration

**Time estimate:** 5–15 minutes (DNS propagation varies).

1. In Vercel Dashboard → your project → **Settings** → **Domains**.
2. Add your custom domain (e.g., `myblog.com`).
3. Follow Vercel's DNS instructions (CNAME or A record depending on your DNS provider).
4. Wait for DNS propagation and SSL provisioning (usually <5 minutes).

> [!important] Update after domain change
> Two things must be updated when you add or change the domain:
>
> 1. **`NEXT_PUBLIC_APP_URL`** — Set to `https://yourdomain.com` in Vercel environment variables. This affects metadata, OG images, RSS, sitemap, and canonical URLs.
> 2. **`app/robots.ts`** — Contains a hardcoded sitemap URL (`https://jp-my-blog.vercel.app/sitemap.xml`). Update this to your new domain and redeploy.

**Verify:** Visit `https://yourdomain.com` — the blog loads with a valid SSL certificate. Check `/sitemap.xml` to confirm URLs use the new domain.

---

## Subsequent Deployments

After initial setup, deployments are fully automatic:

1. Push a commit to the connected GitHub branch.
2. Vercel detects the push and runs `npm run build`, which executes:
   ```
   prisma db push --accept-data-loss
   prisma generate
   npx tsx scripts/backfill-thumbnail.ts
   next build
   ```
3. **Schema changes are applied automatically** — any new models or fields added to `prisma/schema.prisma` are pushed to the database before the build completes. No manual `db:push` steps required.
4. On success, the new deployment is promoted to production (~60–90 seconds).
5. On failure, the previous deployment remains live (no downtime).

### Rolling back a deployment

1. Vercel Dashboard → your project → **Deployments** tab.
2. Find the last known-good deployment (green checkmark).
3. Click the three-dot menu → **Promote to Production**.
4. The rollback is instant — no rebuild required.

---

## Post-Action Verification Checklist

After any deployment or configuration change, confirm:

- [ ] Homepage loads at `/` with blog content
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] Admin login works at `/admin/login`
- [ ] Can create a new post and see it on the blog within 60 seconds (ISR revalidation)
- [ ] Comment form appears on published blog posts
- [ ] `/admin/comments` shows the moderation queue
- [ ] OG image generates at `/api/og?title=Test`
- [ ] `/sitemap.xml` returns valid XML with correct domain URLs
- [ ] `/feed.xml` returns valid RSS 2.0
- [ ] `/robots.txt` disallows `/admin/` and `/api/auth/`
- [ ] ⌘K search returns results for published posts

---

## Known Limitations

- **Rate limiting is in-process** — uses a `Map` in memory, not Redis. Works for Vercel Hobby (single concurrent instance) but would not survive multi-instance scaling.
- **Image uploads disabled on Vercel** — `/api/upload` returns 501 by design. Use HTTPS image URLs for cover images. See [[troubleshooting-runbook#Upload Returning 501]].
- **Neon free tier cold starts** — database suspends after 5 minutes of inactivity. First request after suspension takes 2–5 seconds. ISR caching mitigates this for public pages.

---

**See also:** [[database-management]] for ongoing database operations · [[troubleshooting-runbook]] for diagnosing issues
