# Database Operations

## Prerequisites

- Node.js 18+ and npm installed
- `DATABASE_URL` set in `.env.local` (local) or Vercel environment variables (hosted)
- The Prisma CLI available via `npx prisma`

**Blast radius awareness:** All database operations described here affect the shared database. During the initial rollout, local development, Vercel Development, and Vercel Preview share one database. A destructive operation in one environment affects all of them.

---

## Schema migrations

### Current state

The project does **not** use checked-in Prisma migrations (`prisma/migrations/`). Schema changes are applied with `prisma db push`, which compares the schema file to the live database and applies changes directly.

**Trade-off:** `db push` is simpler for early development but doesn't create a migration history. Before the schema stabilizes, the project should transition to `prisma migrate dev` for versioned, reviewable migrations.

### Applying schema changes

**Rollback:** Before pushing schema changes, back up your data (see [Backup](#backup) below). `db push` can drop columns if you remove them from the schema.

**Time estimate:** 1–2 minutes.

1. Edit `prisma/schema.prisma` with your changes.
2. Validate the schema:
   ```bash
   npx prisma validate
   ```
   **Expected output:** `The schema at prisma/schema.prisma is valid.`

3. Generate the updated Prisma client:
   ```bash
   npm run db:generate
   ```
   **Expected output:** `✔ Generated Prisma Client`

4. Push the schema to the database:
   ```bash
   npm run db:push
   ```
   **Expected output:** `Your database is now in sync with your Prisma schema.`

   ⚠️ **Safety gate:** If `db push` warns about data loss (dropping columns/tables), it will prompt for confirmation. Read the warning carefully before confirming.

5. **Verify:** Open Prisma Studio to inspect the schema:
   ```bash
   npx prisma studio
   ```
   Check that new tables/columns exist and existing data is intact.

### Transitioning to migrations (future)

When the schema stabilizes:

```bash
npx prisma migrate dev --name init
```

This creates a `prisma/migrations/` directory with SQL migration files. From that point forward, use `prisma migrate deploy` in production instead of `db push`.

---

## Seed data

### Running the seed script

The seed script (`prisma/seed.ts`) creates:
- One admin user (`admin@aicodingblog.com` / `admin123`)
- Three categories (Artificial Intelligence, Web Development, Tutorials)
- Six tags (TypeScript, Next.js, React, Prisma, Docker, Machine Learning)
- One sample blog post

**Blast radius:** The seed script uses `upsert` for the user, categories, and tags — it won't duplicate existing records. The sample post is only created if its slug doesn't already exist.

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

**Verify:** Log in at `/admin/login` with `admin@aicodingblog.com` / `admin123` and check that categories, tags, and the sample post appear.

### Re-running the seed

Safe to re-run. The `upsert` operations update existing records (e.g., resetting the admin password to `admin123`) rather than failing on duplicates.

⚠️ **Safety gate:** Re-running the seed resets the admin password to `admin123`. If you've changed the password, it will be overwritten. Only re-seed intentionally.

---

## Backup

### Exporting data

Neon provides point-in-time recovery on paid plans. On the free tier, export manually:

**Using pg_dump (if you have PostgreSQL tools installed):**

```bash
pg_dump "$DATABASE_URL" --no-owner --no-privileges > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Expected output:** A `.sql` file containing all table definitions and data.

**Using Neon dashboard:**
1. Open the Neon console.
2. Navigate to your project → SQL Editor.
3. Run `SELECT * FROM users;`, `SELECT * FROM posts;`, etc. and export results.

**Using Prisma Studio:**
```bash
npx prisma studio
```
Browse tables and visually verify data. Prisma Studio doesn't export directly, but it's useful for inspection.

### Restoring data

**From a pg_dump backup:**

```bash
psql "$DATABASE_URL" < backup_file.sql
```

⚠️ **Safety gate:** Restoring overwrites existing data in the target tables. Make sure you're restoring to the correct database.

**From scratch (schema + seed):**

```bash
npm run db:push --force-reset   # WARNING: drops all tables and data
npm run db:seed
```

**Blast radius:** `--force-reset` destroys all data in all tables. Use only when you intentionally want a fresh start.

---

## User management

### Viewing users

```bash
npx prisma studio
```

Open the `Users` table to see all admin accounts.

### Resetting a user's password

There is no password reset UI. Reset directly in the database:

**Using Prisma Studio:**
You can't set a bcrypt hash through Prisma Studio easily. Use the seed script or a custom script instead.

**Using a Node.js script:**

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

**Verify:** Log in with the new password at `/admin/login`.

### Disabling MFA for a locked-out user

If a user has lost their authenticator app and can't complete MFA:

```sql
UPDATE users
SET "mfaEnabled" = false, "mfaSecret" = NULL, "pendingMfaSecret" = NULL
WHERE email = 'admin@aicodingblog.com';
```

Run this via the Neon SQL editor or `psql`.

**Expected output:** `UPDATE 1`

**Verify:** Log in at `/admin/login` — the MFA prompt should no longer appear.

⚠️ **Safety gate:** This removes MFA protection. The user should re-enable MFA immediately after regaining access.

### Invalidating all sessions for a user

To force a user to log in again (e.g., after a security concern):

```sql
DELETE FROM sessions WHERE "userId" = (
  SELECT id FROM users WHERE email = 'admin@aicodingblog.com'
);
```

**Expected output:** `DELETE n` (where n is the number of sessions deleted).

**Verify:** The user is redirected to the login page on their next request.

### Changing a user's role

```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

Valid roles in the current schema: `admin` (the only role used; the `role` field defaults to `admin`).

---

## Database inspection

### Checking table sizes

```sql
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### Checking active connections

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
```

Neon free tier limit: 20 concurrent connections.

### Checking session count

```sql
SELECT count(*) AS total_sessions,
       count(*) FILTER (WHERE "expiresAt" > NOW()) AS active_sessions,
       count(*) FILTER (WHERE "expiresAt" <= NOW()) AS expired_sessions
FROM sessions;
```

### Cleaning up expired sessions

```sql
DELETE FROM sessions WHERE "expiresAt" <= NOW();
```

**Expected output:** `DELETE n` (number of expired sessions removed).

This is safe to run at any time. Expired sessions are functionally dead — the app ignores them during lookup — but cleaning them up reduces table bloat.
