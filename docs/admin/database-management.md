---
title: "Database Management"
description: "Prisma CLI operations, schema changes, backups, seeding, and data model reference for the blog's PostgreSQL database"
category: admin
created: 2025-01-15
updated: 2025-01-15
---

# Database Management

> [!info] Prerequisites
> - **PostgreSQL database** accessible via `DATABASE_URL` (see [[deployment#Environment Variables]])
> - **Node.js 18+** and npm installed
> - **Prisma CLI** available via `npx prisma` (installed with project dependencies)
> - **`DATABASE_URL`** configured in `.env.local` (local) or Vercel environment variables (hosted)

> [!warning] Blast radius awareness
> All database operations affect the **shared database**. During initial rollout, local development, Vercel Preview, and Vercel Production may share a single database. A destructive operation in one environment affects all of them.

---

## Rollback: Backup Before Any Change

> [!danger] Always backup before schema changes or destructive operations
> `db:push` can drop columns if you remove fields from the schema. There is no automatic undo. Take a backup first — always.

### Full backup with `pg_dump`

**Time estimate:** 1–5 minutes depending on database size.

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Expected output:** A `.sql` file containing all table definitions and row data.

**Verify:** Check the file is non-empty:
```bash
wc -l backup_*.sql
```
**Expected:** At least several hundred lines for a seeded database.

### Restore from backup

> [!danger] Safety gate — destructive
> Restoring overwrites existing data in the target tables. Triple-check you are targeting the correct database.

```bash
psql "$DATABASE_URL" < backup_file.sql
```

**Expected output:** A series of `CREATE TABLE`, `INSERT`, etc. statements with no errors.

**Verify:** Run `npm run db:studio` and inspect tables — row counts should match the backup.

### Full reset (nuclear option)

> [!danger] Safety gate — destroys ALL data
> `--force-reset` drops every table and recreates the schema from scratch. All posts, users, sessions, categories, and tags are permanently deleted. Only use for a complete fresh start.

```bash
npx prisma db push --force-reset
npm run db:seed
```

**Step 1 confirmation:** Prisma will prompt: `Are you sure you want to reset your database?` — type `y` only if intentional.

**Step 2 expected output:** `Database seeded successfully!`

---

## Prisma CLI Commands Reference

All database scripts from `package.json`:

| Script | Command | What It Does | When to Use | Blast Radius |
|--------|---------|-------------|-------------|--------------|
| `npm run db:validate` | `prisma validate` | Checks `schema.prisma` syntax without touching the database | After editing the schema, before any other step | None — read-only |
| `npm run db:generate` | `prisma generate` | Generates the TypeScript Prisma Client from the schema | After schema changes, before building the app | None — only affects local `node_modules` |
| `npm run db:push` | `prisma db push` | Syncs the database schema to match `schema.prisma` | Development: applying schema changes to the DB | **High** — can drop columns/tables if fields were removed |
| `npm run db:migrate` | `prisma migrate dev` | Creates a versioned SQL migration file and applies it | Production: when migration history is needed | **High** — alters database schema |
| `npm run db:seed` | `tsx prisma/seed.ts` | Inserts admin user + sample categories, tags, and one post | Initial setup or dev environment reset | **Medium** — upserts data; re-running resets admin password to `admin123` |
| `npm run db:studio` | `prisma studio` | Opens a GUI at `localhost:5555` for browsing/editing data | Data inspection, quick manual fixes | **Variable** — direct edits bypass app logic |

### Typical workflow order

```
db:validate → db:generate → db:push (dev) or db:migrate (prod) → db:seed (if fresh)
```

---

## `db:push` vs `db:migrate`

> [!important] Current project uses `db:push` — no migration files exist
> The project does **not** have a `prisma/migrations/` directory. Schema changes are applied directly with `db:push`, which compares `schema.prisma` to the live database and applies diffs.
>
> **Trade-off:** `db:push` is simpler and faster for development, but creates no rollback history. You cannot revert a pushed change without a backup. Before the schema stabilizes for production use, consider transitioning to `db:migrate`.

| Aspect | `db:push` | `db:migrate` |
|--------|-----------|--------------|
| Migration files | None | Versioned SQL files in `prisma/migrations/` |
| Rollback | Manual (restore from backup) | Can revert specific migrations |
| Team workflow | No migration conflicts | Migration files need to be committed and coordinated |
| Production safety | Low — no audit trail | High — reviewable SQL before deploy |
| Current project | ✅ In use | Available but not yet initialized |

### Transitioning to migrations

When the schema stabilizes:

1. Create the initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
   **Expected output:** Creates `prisma/migrations/YYYYMMDD_init/migration.sql` and applies it.

2. From that point forward, use `prisma migrate deploy` in production CI/CD instead of `db:push`.

---

## Seeding

The seed script (`prisma/seed.ts` run via `tsx`) creates:

- **1 admin user:** `admin@aicodingblog.com` / `admin123` (role: `admin`)
- **3 categories:** Artificial Intelligence, Web Development, Tutorials
- **6 tags:** TypeScript, Next.js, React, Prisma, Docker, Machine Learning
- **1 sample blog post:** "Building Modern AI Applications with Next.js"

```bash
npm run db:seed
```

**Expected output:**
```
Starting database seed...
Created admin user: admin@aicodingblog.com
Created categories
Created tags
Created sample post: Building Modern AI Applications with Next.js
Database seeded successfully!
```

> [!warning] Re-running the seed resets the admin password
> The seed uses `upsert` — it won't duplicate records, but it **will overwrite** the admin user's password back to `admin123`. Only re-seed intentionally.

> [!caution] Seed is for initial setup, not production refresh
> The seed script is designed for bootstrapping new environments. Don't use it to "refresh" a production database — it will reset the admin password and may conflict with real content.

**Verify:** Log in at `/admin/login` with `admin@aicodingblog.com` / `admin123` and confirm categories, tags, and the sample post appear.

---

## Prisma Studio

```bash
npm run db:studio
```

Opens a browser GUI at `http://localhost:5555` for inspecting and editing database records.

> [!caution] Direct edits bypass application logic
> Prisma Studio writes directly to the database. It does **not**:
> - Generate slugs from titles
> - Calculate `readingTime`
> - Trigger ISR revalidation (`revalidatePath`)
> - Enforce Zod validation rules
> - Update `updatedAt` timestamps
>
> Use Studio for **inspection and emergency fixes only**. For normal operations, use the admin panel.

**Useful for:**
- Verifying schema changes took effect
- Inspecting session records
- Confirming seed data
- Emergency MFA disable (set `mfaEnabled = false`, clear `mfaSecret`)

---

## Schema Change Workflow

**Time estimate:** 5–10 minutes for a simple field addition.

### Before starting — backup

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Procedure

1. **Edit the schema:**
   ```bash
   # Open prisma/schema.prisma and make your changes
   ```

2. **Validate syntax:**
   ```bash
   npm run db:validate
   ```
   **Expected output:** `The schema at prisma/schema.prisma is valid.`

3. **Generate the updated Prisma Client:**
   ```bash
   npm run db:generate
   ```
   **Expected output:** `✔ Generated Prisma Client`

4. **Push to the database (development):**
   ```bash
   npm run db:push
   ```
   **Expected output:** `Your database is now in sync with your Prisma schema.`

   > [!danger] Safety gate — column drops
   > If `db:push` detects that your changes would drop columns or tables, it prompts for confirmation. **Read the warning carefully.** Dropped columns mean lost data.

5. **Verify:**
   ```bash
   npm run db:studio
   ```
   Inspect the affected tables — new columns should appear, existing data should be intact.

---

## Data Model Reference

The database has **6 models** and **2 junction tables**:

### Core Models

**User** — Admin/editor accounts
| Field | Type | Key Attributes | Notes |
|-------|------|---------------|-------|
| `id` | String | `@id @default(cuid())` | |
| `email` | String | `@unique` | Login identifier |
| `name` | String? | | Display name |
| `passwordHash` | String | | bcrypt (10 rounds) |
| `role` | String | `@default("admin")` | `"admin"` or `"editor"` |
| `avatar` | String? | | URL to avatar image |
| `bio` | String? | | Author card on post pages |
| `mfaEnabled` | Boolean | `@default(false)` | |
| `mfaSecret` | String? | | Active TOTP secret |
| `pendingMfaSecret` | String? | | Pre-verification TOTP secret |
| `mfaRequired` | Boolean | `@default(false)` | Admin-enforced MFA policy |

**Session** — Login sessions (7-day TTL)
| Field | Type | Key Attributes | Notes |
|-------|------|---------------|-------|
| `id` | String | `@id @default(cuid())` | |
| `userId` | String | `@@index` | FK → User (cascade delete) |
| `token` | String | `@unique` | 32-byte random hex |
| `expiresAt` | DateTime | | 7 days from creation |

**Post** — Blog posts
| Field | Type | Key Attributes | Notes |
|-------|------|---------------|-------|
| `id` | String | `@id @default(cuid())` | |
| `title` | String | | Max 200 chars (Zod) |
| `slug` | String | `@unique @@index` | Auto-generated from title |
| `excerpt` | String? | | |
| `content` | String | | Markdown body |
| `coverImage` | String? | | Must be `https://` URL on Vercel |
| `published` | Boolean | `@default(false)` | |
| `featured` | Boolean | `@default(false)` | Shown on homepage |
| `views` | Int | `@default(0)` | Incremented on every render (no dedup) |
| `readingTime` | Int | `@default(0)` | Minutes, calculated at 200 WPM |
| `publishedAt` | DateTime? | `@@index([published, publishedAt])` | Set on first publish |
| `authorId` | String | `@@index` | FK → User (cascade) |

**Category** — Post categories
| Field | Type | Key Attributes |
|-------|------|---------------|
| `id` | String | `@id @default(cuid())` |
| `name` | String | `@unique` |
| `slug` | String | `@unique` |
| `description` | String? | |

**Tag** — Post tags (no description field, unlike Category)
| Field | Type | Key Attributes |
|-------|------|---------------|
| `id` | String | `@id @default(cuid())` |
| `name` | String | `@unique` |
| `slug` | String | `@unique` |

### Junction Tables (Many-to-Many)

**PostCategory** — Links posts to categories
| Field | Type | Notes |
|-------|------|-------|
| `postId` | String | Composite PK with `categoryId` |
| `categoryId` | String | Both FKs cascade on delete |

**PostTag** — Links posts to tags
| Field | Type | Notes |
|-------|------|-------|
| `postId` | String | Composite PK with `tagId` |
| `tagId` | String | Both FKs cascade on delete |

> [!important] Cascade delete behavior
> Deleting a Post automatically removes its PostCategory and PostTag junction records. Deleting a Category or Tag also removes its junction records. This means:
> - Deleting a category **does not** delete the posts in that category — only the association.
> - Deleting a post **does** remove all its category and tag associations.

---

## User Management Operations

### Reset a user's password

There is no password-reset UI. Reset directly via a script:

```bash
npx tsx -e "
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('new-secure-password', 10);
  await prisma.user.update({
    where: { email: 'admin@aicodingblog.com' },
    data: { passwordHash: hash }
  });
  console.log('Password updated.');
}
main().finally(() => prisma.\$disconnect());
"
```

**Expected output:** `Password updated.`

**Verify:** Log in at `/admin/login` with the new password.

### Disable MFA for a locked-out user

If a user has lost their authenticator app:

**Option A — Admin API** (if you have another admin account):
```bash
curl -X PATCH https://your-site.vercel.app/api/admin/users/USER_ID \
  -H "Cookie: auth_session=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "disable-mfa"}'
```

**Option B — Direct SQL** (emergency):
```sql
UPDATE users
SET "mfaEnabled" = false, "mfaSecret" = NULL, "pendingMfaSecret" = NULL
WHERE email = 'admin@aicodingblog.com';
```

Run via the Neon SQL editor or `psql`.

**Expected output:** `UPDATE 1`

> [!caution] Safety gate
> This removes MFA protection entirely. The user should re-enable MFA immediately after regaining access.

**Verify:** Log in at `/admin/login` — the MFA prompt should no longer appear.

### Invalidate all sessions for a user

To force a user to re-authenticate (e.g., after a security concern):

```sql
DELETE FROM sessions WHERE "userId" = (
  SELECT id FROM users WHERE email = 'admin@aicodingblog.com'
);
```

**Expected output:** `DELETE n` (where n = number of sessions deleted).

**Verify:** The user is redirected to the login page on their next request.

### Clean up expired sessions

Safe to run at any time — removes dead session records:

```sql
DELETE FROM sessions WHERE "expiresAt" <= NOW();
```

**Expected output:** `DELETE n`

---

## Database Inspection Queries

### Table sizes

```sql
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### Active connections

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
```

Neon free tier limit: **20 concurrent connections**.

### Session health

```sql
SELECT count(*) AS total_sessions,
       count(*) FILTER (WHERE "expiresAt" > NOW()) AS active_sessions,
       count(*) FILTER (WHERE "expiresAt" <= NOW()) AS expired_sessions
FROM sessions;
```

---

## Post-Action Verification Checklist

After any schema change, data operation, or backup/restore:

- [ ] `npm run db:validate` passes
- [ ] `npm run db:generate` succeeds
- [ ] `npm run build` completes without errors
- [ ] Admin panel loads at `/admin`
- [ ] Posts display correctly on the public blog
- [ ] `/api/health` returns `{"status":"ok"}`

---

**See also:** [[deployment]] for environment variable reference · [[troubleshooting-runbook]] for database connection issues
