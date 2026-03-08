# Monitoring and Incident Response

## Prerequisites

- Access to the [Vercel dashboard](https://vercel.com/dashboard) for the project
- Access to the [Neon dashboard](https://console.neon.tech) for the database
- (Optional) `psql` or Prisma Studio for database inspection

## Health checks

### Application health endpoint

**URL:** `https://your-site.vercel.app/api/health`

**Expected response:**
```json
{"status":"ok"}
```

**What it proves:** The serverless function runtime is operational and can respond to HTTP requests. It does **not** prove database connectivity — the health endpoint is a simple JSON response with no database call.

**Monitoring approach:** Ping `/api/health` from an external uptime monitor (e.g., UptimeRobot free tier, Vercel's built-in analytics, or a cron job). Alert if the response is not `200 OK` or if latency exceeds 5 seconds.

### Database health

There is no dedicated database health endpoint in the app. To check database connectivity:

**Quick check via any database-backed page:**

Visit the homepage (`/`) or any blog post page. If the page loads with content, the database is reachable. If you see an error page, check the Vercel Function logs.

**Direct check via SQL:**

```sql
SELECT 1;
```

Run via the Neon SQL editor. If this times out, the database is suspended or unreachable.

### Build health

The Vercel dashboard shows the status of every deployment:

1. Go to your project → **Deployments** tab.
2. Each deployment shows ✅ (success), ❌ (failed), or 🔄 (building).
3. Click a failed deployment to see the build log.

---

## Vercel dashboard monitoring

### Key metrics to watch

| Metric | Where to find it | Normal range | Concern threshold |
|--------|-----------------|--------------|-------------------|
| Function invocations | Vercel → Analytics → Functions | Depends on traffic | Sudden spike (possible bot attack) |
| Function duration | Vercel → Analytics → Functions | 50–500ms | > 5s (Neon cold start or slow query) |
| Function errors | Vercel → Analytics → Functions | 0 | Any 500-series errors |
| Build duration | Vercel → Deployments | 30–90s | > 5 minutes |
| Bandwidth | Vercel → Usage | < 100 GB/month | Approaching 100 GB (Hobby limit) |

### Function logs

1. Go to your project → **Logs** tab (or **Functions** → select a function → **Logs**).
2. Filter by:
   - **Level:** Error (to see only failures)
   - **Function:** Specific route (e.g., `/api/auth/login`)
   - **Time range:** Last hour, last 24 hours, etc.

The app uses structured `console.error()` calls with context objects, so error logs include route names, error messages, and stack traces.

---

## Common alerts and responses

### Alert: Function timeout (504)

**Symptom:** Pages or API routes return 504 Gateway Timeout after 10 seconds.

```
→ Is it a specific route or all routes?
  ├─ All routes → Database is unreachable
  │   → Check Neon dashboard: is the project active?
  │   → Check DATABASE_URL in Vercel env vars
  │   → Run SELECT 1; in Neon SQL editor
  │   └─ If Neon is down → Wait for Neon recovery; check status.neon.tech
  │
  └─ Specific route → Route-specific issue
      → Check Vercel Function logs for that route
      → Is it /admin/* routes?
      │   ├─ Yes → Check for self-fetch in middleware.ts (should never fetch internal routes)
      │   └─ No → Check for expensive database queries
      └─ Escalate: Review recent code changes to that route
```

### Alert: Build failure

**Symptom:** Vercel deployment fails during build.

```
→ Read the build log. What's the first error?
  ├─ "DATABASE_URL is required"
  │   → DATABASE_URL not set in Vercel env vars
  │   → Fix: Add it in Vercel → Settings → Environment Variables
  │
  ├─ "Can't reach database server"
  │   → Database unreachable at build time
  │   → Fix: Wake Neon database, verify connection string
  │
  ├─ TypeScript error
  │   → Code error in a recent commit
  │   → Fix: Run npm run typecheck locally, fix the error, push
  │
  └─ "prisma generate" fails
      → Prisma schema has a syntax error
      → Fix: Run npx prisma validate locally, fix schema, push
```

### Alert: Login not working

**Symptom:** Users can't log in or see "Unauthorized" errors.

```
→ Can you reach /admin/login page?
  ├─ No (404 or error page)
  │   → Deployment issue. Check Vercel build status.
  │
  └─ Yes (login form appears)
      → Enter credentials. What happens?
        ├─ Hangs indefinitely
        │   → Self-fetch deadlock in middleware (see technical/auth-system.md)
        │   → Fix: Verify middleware.ts only checks cookies
        │
        ├─ "Invalid credentials" error
        │   → Wrong email or password
        │   → Fix: Reset password via database (see admin/database-operations.md)
        │
        ├─ Redirects back to login
        │   → Session not being created or cookie not being set
        │   → Check: DATABASE_URL valid? sessions table writable?
        │   → Check: Browser cookies enabled? Not blocking host-only cookies?
        │
        └─ MFA prompt appears but codes fail
            → MFA_TOKEN_SECRET mismatch or TOTP clock skew
            → Fix: Verify MFA_TOKEN_SECRET in Vercel env vars
            → Fix: Check device clock is synchronized
            → Last resort: Disable MFA via database (see admin/database-operations.md)
```

### Alert: Content not updating

**Symptom:** Edits to posts don't appear on the public site.

```
→ How long since the edit?
  ├─ < 60 seconds → ISR hasn't revalidated yet. Wait and refresh.
  │
  └─ > 60 seconds
      → Is the edit saved in the admin dashboard?
        ├─ No → The save operation failed. Check browser network tab.
        │
        └─ Yes
            → Hard refresh (Ctrl+Shift+R) to bypass browser cache
            → Still stale?
              ├─ Check Vercel CDN: Try appending ?nocache=1 to the URL
              └─ Check if revalidatePath() is being called in the API route
```

---

## Incident response procedure

### Severity levels

| Level | Definition | Response time | Examples |
|-------|-----------|--------------|---------|
| **P1 — Site down** | Public site unreachable or returning 500s | Immediate | Database unreachable, Vercel outage |
| **P2 — Admin broken** | Public site works but admin is inaccessible | Within 1 hour | Login broken, session issues |
| **P3 — Degraded** | Site works but with issues | Within 24 hours | Slow pages, stale content, broken images |
| **P4 — Cosmetic** | Minor visual or non-functional issues | Next maintenance window | Styling bugs, typos |

### P1 response checklist

1. **Confirm the outage:**
   - [ ] Check `/api/health` — does it return 200?
   - [ ] Check homepage — does it load?
   - [ ] Check Vercel status page: [vercel.com/status](https://www.vercel-status.com/)
   - [ ] Check Neon status page: [status.neon.tech](https://status.neon.tech/)

2. **Identify the cause:**
   - [ ] Vercel outage → Wait for recovery. Nothing to do on our side.
   - [ ] Neon outage → Wait for recovery. Pages cached by ISR may still serve.
   - [ ] Bad deployment → Roll back to the previous deployment in Vercel dashboard (Deployments → click previous successful deployment → "Promote to Production").
   - [ ] Configuration issue → Check environment variables in Vercel.

3. **Recover:**
   - [ ] If rollback: Verify the rolled-back deployment works.
   - [ ] If database: Run `SELECT 1;` in Neon to confirm recovery.
   - [ ] Verify all items in the [post-deployment checklist](./deployment.md#post-deployment-verification-checklist).

4. **Document:**
   - What happened, when, how long it lasted, what fixed it.

---

## Neon-specific monitoring

### Auto-suspend behavior

Neon free tier databases suspend after 5 minutes of inactivity. The first query after suspension takes 2–5 seconds (cold start).

**Impact on the app:** The first visitor after a period of inactivity experiences a slow page load. Subsequent requests are fast. ISR caching helps — if a cached page exists, it's served immediately while a background revalidation wakes the database.

**Monitoring:** Check Vercel Function duration metrics. If you see periodic spikes of 2–5 seconds after periods of no traffic, that's Neon cold starts — expected behavior on the free tier.

### Connection limits

Neon free tier: 20 concurrent connections.

The Prisma singleton pattern in `lib/prisma.ts` reuses one client instance, but multiple concurrent serverless function invocations each create their own connection. On Hobby tier (low concurrency), this is rarely an issue.

**If you see "too many connections" errors:** Reduce Prisma's connection pool size by adding `?connection_limit=5` to your `DATABASE_URL`, or upgrade the Neon plan.
