# Deployment Procedure

## Prerequisites

Before starting, confirm you have all of these:

- [ ] A GitHub account with the repository forked or pushed
- [ ] A Vercel account (Hobby tier — free)
- [ ] A Neon account (free tier) or other hosted PostgreSQL provider
- [ ] Node.js 18+ and npm installed locally
- [ ] The repository cloned locally with `npm install` completed

**Blast radius:** This procedure creates a public website. The default admin credentials are well-known (`admin@aicodingblog.com` / `admin123`). Change the password immediately after first login.

**Time estimate:** 15–20 minutes for the full procedure.

## Rollback

If something goes wrong at any step, here's how to undo it:

| Stage | Rollback action |
|-------|----------------|
| **Database schema pushed** | Drop and recreate the Neon database from the Neon dashboard, or run `prisma db push --force-reset` (destroys all data) |
| **Database seeded** | Delete seeded records via Prisma Studio (`npx prisma studio`) or drop/recreate the database |
| **Vercel project created** | Delete the project from Vercel dashboard → Settings → General → Delete Project |
| **Vercel deployment live** | Redeploy a previous commit from the Vercel Deployments tab, or delete the project |
| **Environment variables set** | Remove them from Vercel dashboard → Settings → Environment Variables |

## Procedure

### Step 1: Provision the database

**Time estimate:** 3 minutes

1. Go to [neon.tech](https://neon.tech) and create a new project.
2. Choose a region close to your Vercel deployment region (e.g., `us-east-1` for Vercel's default).
3. Copy the connection string. It looks like:
   ```
   postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. **Verify:** Open the Neon SQL editor and run `SELECT 1;`. You should see a result of `1`.

**Expected output:** A working PostgreSQL connection string with SSL.

### Step 2: Configure local environment

**Time estimate:** 2 minutes

```bash
cd JP-MyBlog
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="generate-a-random-string-at-least-32-characters"
```

**Verify:** Run `cat .env.local` (or open the file) and confirm all three variables are set with real values, not placeholders.

**Expected output:** Three non-empty environment variable assignments.

### Step 3: Bootstrap the database

**Time estimate:** 2 minutes

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

**Verify each step:**

| Command | Expected output |
|---------|----------------|
| `db:generate` | `✔ Generated Prisma Client` |
| `db:push` | `Your database is now in sync with your Prisma schema.` |
| `db:seed` | `Created admin user: admin@aicodingblog.com` and `Database seeded successfully!` |

⚠️ **Safety gate:** `db:push` modifies the database schema. If the database already has tables, it may alter or drop columns. Run this only on a fresh database for the initial setup.

### Step 4: Verify local build

**Time estimate:** 3 minutes

```bash
npm run readiness:preflight
```

This runs `typecheck` → `db:validate` → `db:generate` → `build`.

**Expected output:** All four steps pass. The build output shows pages generated for `/`, `/blog`, and individual post slugs.

**If it fails:** Check that `DATABASE_URL` is correct and the database is reachable. See [troubleshooting](#troubleshooting) below.

### Step 5: Create the Vercel project

**Time estimate:** 3 minutes

1. Go to [vercel.com/new](https://vercel.com/new).
2. Import your GitHub repository.
3. **Framework Preset:** Next.js (auto-detected).
4. **Root Directory:** Leave as default if the repo root is the project root. If the repo uses a monorepo structure with the app at `upstream/JP-MyBlog/`, set the root directory accordingly.
5. **Do not deploy yet** — add environment variables first.

### Step 6: Set environment variables

On the Vercel project settings page (Settings → Environment Variables):

| Variable | Value | Environments |
|----------|-------|-------------|
| `DATABASE_URL` | Your Neon connection string | Preview, Production |
| `MFA_TOKEN_SECRET` | Same value as your `.env.local` | Preview, Production |

Leave `NEXT_PUBLIC_APP_URL` **unset** unless you have a custom domain. The app falls back to `VERCEL_URL` automatically.

**Verify:** The environment variables table shows both variables with values (masked).

### Step 7: Deploy

1. Click **Deploy** (or push a commit to trigger auto-deploy).
2. Watch the build logs. You should see:
   - `prisma generate` succeeds
   - `next build` succeeds
   - Pages are generated
3. The deployment URL appears when the build completes.

**Expected output:** A live URL like `https://your-project.vercel.app`.

**Verify the deployment:**

| Check | URL | Expected |
|-------|-----|----------|
| Homepage loads | `/` | Blog homepage with the sample post |
| Health endpoint | `/api/health` | `{"status":"ok"}` |
| Admin login | `/admin/login` | Login form appears |
| Admin access | Log in with `admin@aicodingblog.com` / `admin123` | Admin dashboard loads |
| OG image | `/api/og?title=Test` | A purple gradient image with "Test" |

### Step 8: Run hosted smoke tests

**Time estimate:** 2 minutes

```bash
PLAYWRIGHT_BASE_URL=https://your-project.vercel.app PLAYWRIGHT_ADMIN_EMAIL=admin@aicodingblog.com PLAYWRIGHT_ADMIN_PASSWORD=admin123 npm run test:smoke:hosted
```

**Expected output:** All smoke tests pass.

**If tests fail:** Check the Playwright report (`npm run test:report`) for screenshots and error details.

### Step 9: Change the default password

⚠️ **Security gate:** The default credentials are public knowledge. Change them immediately.

1. Log in to `/admin/login` with the default credentials.
2. Go to **Settings** (or **Users** if you have admin access to the user management page).
3. Change the password to something strong.

**Verify:** Log out and log back in with the new password.

## Post-deployment verification checklist

- [ ] Homepage loads and shows the sample post
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] Admin login works
- [ ] Can create a new post and see it on the blog within 60 seconds
- [ ] OG image generates at `/api/og?title=Test`
- [ ] `/sitemap.xml` returns valid XML with post URLs
- [ ] `/feed.xml` returns valid RSS
- [ ] `/robots.txt` disallows `/admin/` and `/api/auth/`
- [ ] Hosted smoke tests pass

## Troubleshooting

### Build fails: "DATABASE_URL is required"

→ **Cause:** Environment variable not set in Vercel.
→ **Diagnostic:** Check Vercel → Settings → Environment Variables.
→ **Fix:** Add `DATABASE_URL` with your Neon connection string.
→ **Escalate:** If the variable is set but the error persists, check that it's enabled for the correct environment (Preview vs Production).

### Build fails: Prisma connection timeout

→ **Cause:** Database is unreachable (Neon suspended, wrong region, network issue).
→ **Diagnostic:** Try connecting from the Neon dashboard SQL editor.
→ **Fix:** Wake the database (any query via the Neon dashboard), verify the connection string, check the region.
→ **Escalate:** If the database is awake and the connection string is correct, check Neon's status page for outages.

### Deploy succeeds but pages show errors

→ **Cause:** Database was reachable at build time but not at runtime (rare with Neon).
→ **Diagnostic:** Check Vercel Function logs for Prisma errors.
→ **Fix:** Verify the `DATABASE_URL` is the same for build and runtime. Neon connection strings are the same for both.
→ **Escalate:** Check Neon connection limits (free tier: 20 connections).

### Admin login hangs

→ **Cause:** See the [self-fetch deadlock](../technical/auth-system.md#the-self-fetch-deadlock-fix) explanation. If middleware was modified to fetch internal routes, revert the change.
→ **Diagnostic:** Vercel Function logs show Edge function timeout.
→ **Fix:** Ensure `middleware.ts` only reads cookies, never fetches.
