---
title: "Troubleshooting Runbook"
description: "Decision-tree troubleshooting for build failures, database errors, auth problems, ISR cache, MFA issues, and common operational incidents"
category: admin
created: 2025-01-15
updated: 2025-01-15
---

# Troubleshooting Runbook

> [!info] How to use this runbook
> Each section is a **decision tree**. Start at the **symptom**, run the **diagnostic**, identify the **cause**, apply the **fix**, and check the **escalation threshold** if the fix doesn't resolve it.
>
> Every fix links to the relevant procedure doc for full steps.

> [!warning] Before any fix that modifies data or config
> Take a database backup first: `pg_dump "$DATABASE_URL" --no-owner --no-privileges > backup_$(date +%Y%m%d_%H%M%S).sql`
>
> See [[database-management#Full backup with pg_dump]] for details.

---

## Build Failures

**Symptom:** `next build` fails during Vercel deployment or local `npm run build`.

**Time to resolve:** 5–15 minutes.

```
→ Read the build log. What is the first error?
│
├─ "DATABASE_URL is required" or "Can't reach database server"
│   → Diagnostic: Is DATABASE_URL set?
│   │   ├─ Local: Check .env.local has DATABASE_URL with a valid connection string
│   │   └─ Vercel: Check Settings → Environment Variables → DATABASE_URL exists
│   │       and is enabled for the correct environment (Production / Preview)
│   │
│   → Diagnostic: Is the database reachable?
│   │   ├─ Open Neon dashboard → SQL Editor → run SELECT 1;
│   │   ├─ If it works → connection string is wrong (typo, wrong host, missing sslmode)
│   │   └─ If it fails → Neon is suspended or down
│   │       → Fix: Wake the database (any query in Neon dashboard)
│   │       → Escalation: Check status.neon.tech for outages
│   │
│   → Fix: Add or correct DATABASE_URL
│       → See [[deployment#Environment Variables]] for format
│       → Redeploy after fixing
│
├─ "prisma generate" fails or "Prisma schema validation error"
│   → Diagnostic: Run locally:
│   │   npx prisma validate
│   │
│   → Cause: Syntax error in prisma/schema.prisma
│   → Fix: Correct the schema, commit, push
│   → See [[database-management#Schema Change Workflow]]
│
├─ TypeScript error (TS2xxx, TS7xxx, etc.)
│   → Diagnostic: Run locally:
│   │   npm run typecheck
│   │
│   → Cause: Code error in a recent commit
│   → Fix: Resolve the type error locally, commit, push
│   → Escalation: If the error is in generated code (Prisma Client),
│       run npm run db:generate to regenerate
│
├─ "Module not found" or import errors
│   → Diagnostic: Run locally:
│   │   npm install && npm run build
│   │
│   → Cause: Missing dependency or broken import path
│   → Fix: Install missing package or fix the import
│   → Escalation: Check that package.json matches the deployment (no
│       local-only dependencies)
│
└─ None of the above
    → Diagnostic: Check the Node.js and Next.js version requirements
    │   node --version  (need 18+)
    │   Check package.json for Next.js version (15.x)
    │
    → Escalation: If the error is unfamiliar, check the Next.js GitHub
        issues for the specific error message
```

**Post-fix verification:**
- [ ] `npm run build` succeeds locally
- [ ] Vercel deployment completes with green checkmark
- [ ] `/api/health` returns `{"status":"ok"}`

---

## Database Connection Errors

**Symptom:** "Can't reach database server", Prisma connection timeout, or `P1001`/`P1002` errors.

**Time to resolve:** 2–10 minutes.

```
→ Is the error happening on all routes or just some?
│
├─ All routes → Database is unreachable
│   │
│   → Diagnostic: Check Neon dashboard — is the project active?
│   │   ├─ Project shows "Suspended" → Neon free tier auto-suspends after 5 min idle
│   │   │   → Fix: Run any query in Neon SQL editor to wake it (SELECT 1;)
│   │   │   → Note: First request after wake takes 2–5 seconds (cold start)
│   │   │
│   │   └─ Project shows "Active" but queries fail
│   │       → Check status.neon.tech for outages
│   │       → Escalation: If Neon is up, check their connection limits
│   │
│   → Diagnostic: Is DATABASE_URL format correct?
│   │   Required format: postgresql://user:pass@host:5432/dbname?sslmode=require
│   │   ├─ Missing sslmode=require → Connection refused (Neon requires SSL)
│   │   ├─ Wrong host/port → Connection timeout
│   │   └─ Wrong credentials → Authentication failed (different error, not timeout)
│   │
│   → Fix: Correct DATABASE_URL in Vercel env vars and redeploy
│       → See [[deployment#Environment Variables]]
│
├─ Intermittent "too many connections" errors
│   → Cause: Connection pool exhaustion
│   │   Neon free tier: 20 concurrent connections
│   │   Each Vercel serverless function instance opens its own connection
│   │
│   → Fix: Add connection limit to DATABASE_URL:
│   │   postgresql://user:pass@host:5432/dbname?sslmode=require&connection_limit=5
│   │
│   → Escalation: If persistent, upgrade Neon plan for higher connection limits
│
└─ Specific route fails, others work
    → Diagnostic: Check Vercel Function logs for that route
    │   Vercel Dashboard → Logs → filter by route
    │
    → Cause: Likely a query error in that specific route's code
    → Fix: Debug the query locally against the same database
    → Escalation: Check if a recent schema change broke the query
```

**Post-fix verification:**
- [ ] Homepage loads with blog content
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] Admin panel loads at `/admin`
- [ ] No Prisma errors in Vercel Function logs

---

## Auth / Session Problems

**Symptom:** Admin panel redirects to `/admin/login` repeatedly, or login succeeds but dashboard doesn't load.

**Time to resolve:** 5–15 minutes.

```
→ Can you reach the /admin/login page?
│
├─ No (404 or error page)
│   → Cause: Deployment issue — the admin routes are missing
│   → Fix: Check Vercel build logs for errors
│   → See the Build Failures tree above
│
└─ Yes (login form appears)
    → Enter credentials. What happens?
    │
    ├─ "Invalid credentials" error
    │   → Cause: Wrong email or password
    │   → Fix: Reset the password via database
    │   → See [[database-management#Reset a user's password]]
    │
    ├─ Login hangs indefinitely (no response)
    │   → Cause: Self-fetch deadlock in edge middleware
    │   │   The middleware must ONLY read cookies — never fetch internal routes.
    │   │   Self-fetch from Edge → Serverless deadlocks on Vercel Hobby tier.
    │   │
    │   → Diagnostic: Check Vercel Function logs for Edge function timeout
    │   → Fix: Verify middleware.ts only checks for cookie presence,
    │       never calls fetch() to internal API routes
    │   → Escalation: Revert recent middleware changes
    │
    ├─ Login succeeds but immediately redirects back to login
    │   → Diagnostic: Check browser DevTools → Application → Cookies
    │   │   Is auth_session cookie present?
    │   │
    │   ├─ Cookie not present
    │   │   → Check: Is the browser blocking cookies? (incognito, extensions)
    │   │   → Check: NODE_ENV — cookie secure flag is true in production.
    │   │       If accessing via HTTP (not HTTPS), the cookie won't be set.
    │   │   → Fix: Access via HTTPS on Vercel, or use http://localhost:3000 locally
    │   │
    │   └─ Cookie present but session rejected
    │       → Diagnostic: Check if the session exists in the database:
    │       │   SELECT * FROM sessions WHERE token = 'COOKIE_VALUE';
    │       │
    │       ├─ No matching session → Session was deleted or never created
    │       │   → Check: Is DATABASE_URL correct? Can the app write to the sessions table?
    │       │
    │       └─ Session exists but expiresAt is in the past
    │           → Cause: Session expired (7-day TTL)
    │           → Fix: Log in again to create a new session
    │
    ├─ Rate limited (429 response)
    │   → Cause: Too many login attempts (5 attempts per 60 seconds per IP)
    │   → Fix: Wait 60 seconds and try again
    │   → Note: Rate limiting is in-process (Map-based), not Redis.
    │       Redeploying clears the rate limit state.
    │
    └─ MFA prompt appears → See the MFA Issues tree below
```

**Post-fix verification:**
- [ ] Login succeeds with correct credentials
- [ ] Admin dashboard loads after login
- [ ] `auth_session` cookie visible in browser DevTools
- [ ] Navigating between admin pages doesn't trigger re-login

---

## MFA Issues

**Symptom:** MFA verification codes are rejected, or MFA setup fails.

**Time to resolve:** 5–10 minutes.

```
→ What specifically is failing?
│
├─ MFA code rejected during login ("Invalid MFA code")
│   │
│   → Diagnostic: Is the authenticator app showing a 6-digit code?
│   │
│   ├─ Yes, code is visible
│   │   → Check: Is the device clock synchronized? TOTP codes are time-based.
│   │   │   A clock drift of >30 seconds causes verification failures.
│   │   │   → Fix: Enable automatic time sync on the device
│   │   │
│   │   → Check: Is MFA_TOKEN_SECRET set in Vercel env vars?
│   │   │   ├─ Not set → Login returns 500 (see 500 Error tree below)
│   │   │   └─ Set but recently changed → All in-flight mfaTokens are invalid
│   │   │       → Fix: Users must re-start the login flow (get a new mfaToken)
│   │   │
│   │   → Check: Has the mfaToken expired? (10-minute TTL)
│   │       → Fix: Go back to the login page and re-enter credentials
│   │           to get a fresh mfaToken
│   │
│   └─ No code / authenticator app error
│       → The user may have lost access to their authenticator
│       → Fix: Admin can disable MFA for the user:
│           PATCH /api/admin/users/[id] with { "action": "disable-mfa" }
│       → Or via direct SQL:
│           UPDATE users SET "mfaEnabled" = false, "mfaSecret" = NULL,
│           "pendingMfaSecret" = NULL WHERE email = 'user@example.com';
│       → See [[database-management#Disable MFA for a locked-out user]]
│
├─ MFA setup (QR code scanning) fails
│   → Diagnostic: Does /api/auth/mfa/generate return a QR code?
│   │   ├─ Yes but scanning fails → Try manual secret entry in the authenticator app
│   │   └─ No (500 error) → Check Vercel Function logs
│   │       → Likely cause: Database write error (pendingMfaSecret column)
│   │
│   → After scanning, first code verification fails
│       → Same clock-sync check as above
│       → The verification uses pendingMfaSecret, not mfaSecret
│       → If the user navigated away and came back, the pending secret may
│           have been regenerated — scan the new QR code
│
└─ MFA was working but suddenly all codes fail
    → Cause: MFA_TOKEN_SECRET was changed or removed in Vercel env vars
    → Fix: Restore the original MFA_TOKEN_SECRET value and redeploy
    → Note: MFA_TOKEN_SECRET signs the mfaToken (challenge), not the
        TOTP secrets themselves. Changing it breaks in-flight logins but
        doesn't invalidate existing MFA setups.
```

> [!danger] Last resort — disable MFA via database
> If all else fails and the only admin is locked out:
> ```sql
> UPDATE users
> SET "mfaEnabled" = false, "mfaSecret" = NULL, "pendingMfaSecret" = NULL
> WHERE email = 'admin@aicodingblog.com';
> ```
> Run via Neon SQL editor. Re-enable MFA immediately after regaining access.

**Post-fix verification:**
- [ ] Login completes successfully (with or without MFA)
- [ ] If MFA was disabled, user can re-enable it from admin settings

---

## ISR Cache Staleness

**Symptom:** Published post changes (edits, new posts) don't appear on the public site.

**Time to resolve:** 1–5 minutes.

```
→ How long since the change was saved?
│
├─ Less than 60 seconds
│   → Cause: ISR hasn't revalidated yet. All public pages use revalidate=60.
│   → Fix: Wait 60 seconds and hard-refresh (Ctrl+Shift+R / Cmd+Shift+R)
│
└─ More than 60 seconds
    │
    → Diagnostic: Is the change saved in the admin panel?
    │   Go to /admin/posts → find the post → confirm the edit is there
    │
    ├─ Change is NOT saved in admin
    │   → The save operation failed silently
    │   → Diagnostic: Open browser DevTools → Network tab → look for failed
    │       PATCH /api/posts/[id] request
    │   → Fix: Re-save the post
    │
    └─ Change IS saved in admin but not visible on public site
        │
        → Diagnostic: Hard-refresh the public page (Ctrl+Shift+R)
        │
        ├─ Content updates after hard-refresh
        │   → Cause: Browser cache was serving the stale version
        │   → Resolved — no further action needed
        │
        └─ Content still stale after hard-refresh
            │
            → Diagnostic: Try with a cache-busting query param:
            │   /blog/post-slug?nocache=1
            │
            ├─ Updated with query param
            │   → Cause: Vercel CDN cache not yet invalidated
            │   → Fix: Trigger a redeploy (push an empty commit or redeploy
            │       from Vercel dashboard) to purge the CDN cache
            │
            └─ Still stale even with query param
                → Diagnostic: Check that revalidatePath() is called in
                │   the API route (app/api/posts/[id]/route.ts should call
                │   revalidatePath('/'), revalidatePath('/blog'),
                │   revalidatePath('/blog/[slug]'))
                │
                → Escalation: Check Vercel ISR logs in the dashboard
                    Vercel Dashboard → your project → Logs → filter for
                    "revalidat" to see ISR activity
```

**Post-fix verification:**
- [ ] Edited post content appears on the public site within 60 seconds
- [ ] New posts appear on `/blog` listing within 60 seconds
- [ ] Homepage featured/latest posts reflect current state

---

## 500 Error on Login

**Symptom:** Login at `/admin/login` returns a 500 Internal Server Error.

**Time to resolve:** 2–5 minutes.

```
→ Diagnostic: Check Vercel Function logs for /api/auth/login
│   Vercel Dashboard → Logs → filter by "/api/auth/login"
│
→ What does the error message say?
│
├─ Database-related error (Prisma, connection refused, timeout)
│   → Cause: DATABASE_URL is missing or database is unreachable
│   → Fix: See the Database Connection Errors tree above
│
├─ "MFA_TOKEN_SECRET" related error or crypto/HMAC error
│   → Cause: MFA_TOKEN_SECRET is not set in Vercel env vars, but a user
│       has MFA enabled. The login route tries to sign an mfaToken and crashes.
│   │
│   → Diagnostic: Check Vercel → Settings → Environment Variables
│   │   Is MFA_TOKEN_SECRET present?
│   │
│   ├─ Not present
│   │   → Fix: Generate and add MFA_TOKEN_SECRET:
│   │       node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
│   │   → Add to Vercel env vars → redeploy
│   │   → See [[deployment#Environment Variables]]
│   │
│   └─ Present but login still fails
│       → The value may be empty or contain invalid characters
│       → Fix: Regenerate with the command above and replace
│
├─ Rate limit error (429, not 500)
│   → Not actually a 500 — the user hit the rate limit
│   → 5 login attempts per 60 seconds per IP
│   → Fix: Wait 60 seconds
│   → Note: Rate limiter is in-process; redeploying resets it
│
└─ Generic 500 with no clear message
    → Diagnostic: Check if the issue reproduces locally with the same
        DATABASE_URL and MFA_TOKEN_SECRET
    → Escalation: Check recent code changes to app/api/auth/login/route.ts
```

**Post-fix verification:**
- [ ] Login returns 200 (or `mfaRequired` response for MFA users)
- [ ] Session cookie is set after successful login
- [ ] Admin dashboard loads after login

---

## Upload Returning 501

**Symptom:** Image upload via the admin panel fails with a 501 "Not Implemented" error.

**Time to resolve:** N/A — this is by design.

```
→ Is the app running on Vercel?
│
├─ Yes (production or preview deployment)
│   → This is EXPECTED BEHAVIOR, not a bug.
│   │
│   → Cause: The upload route checks areFilesystemUploadsDisabled()
│   │   which returns true when the VERCEL env var is set. Vercel's
│   │   serverless functions have a read-only filesystem — file uploads
│   │   would be lost between invocations.
│   │
│   → Fix: Use HTTPS image URLs instead of file uploads.
│   │   In the post editor, paste an image URL (e.g., from Unsplash,
│   │   Imgur, or any CDN) into the cover image field.
│   │
│   │   Valid: https://images.unsplash.com/photo-123.jpg
│   │   Invalid: /uploads/my-image.jpg (won't work on Vercel)
│   │
│   → Future: To enable uploads on Vercel, integrate an object storage
│       service (Vercel Blob, S3, Cloudflare R2) — not yet implemented.
│
└─ No (running locally with npm run dev)
    → Uploads SHOULD work locally. The check is skipped when VERCEL is unset.
    │
    → Diagnostic: Check the upload response in browser DevTools → Network tab
    │
    ├─ 501 locally → VERCEL env var may be accidentally set in .env.local
    │   → Fix: Remove VERCEL= from .env.local
    │
    ├─ 413 (file too large) → File exceeds 5MB limit
    │   → Fix: Compress the image or use a smaller file
    │
    └─ 400 (invalid file type)
        → Only JPEG, PNG, GIF, and WebP are accepted
        → The route checks magic bytes, not just the file extension
        → Fix: Convert the image to a supported format
```

**Post-fix verification:**
- [ ] Cover image displays correctly on the published post
- [ ] OG image at `/api/og?title=PostTitle` generates correctly (uses cover image URL if present)

---

## Search Not Returning Results

**Symptom:** ⌘K search dialog finds nothing, or returns unexpected results.

**Time to resolve:** 2–5 minutes.

```
→ Diagnostic: What are you searching for?
│
├─ A post you just created or edited
│   → Is the post published? (published = true)
│   │   ├─ No → Search only queries published posts. Drafts are excluded.
│   │   │   → Fix: Publish the post first, then search.
│   │   │
│   │   └─ Yes
│   │       → Was it published less than 60 seconds ago?
│   │           → ISR revalidation may not have caught up yet
│   │           → Fix: Wait 60 seconds and search again
│   │           → Note: Search is a server action that queries the DB directly,
│   │               not the ISR cache. It should find published posts immediately.
│   │               If it doesn't, check the database directly.
│
├─ A query that should match but returns nothing
│   → Check: Is the query at least 2 characters?
│   │   Queries shorter than 2 characters are rejected (returns empty).
│   │
│   → Check: Search looks in title, excerpt, AND content fields
│   │   using case-insensitive contains matching.
│   │   It does NOT use PostgreSQL full-text search.
│   │
│   → Diagnostic: Try a simpler query — just one word from the post title
│   │   ├─ Simpler query works → Original query may have been too specific
│   │   └─ Nothing works → Check if the database is reachable
│   │       → See Database Connection Errors tree above
│
└─ Search dialog doesn't open at all
    → Diagnostic: Press ⌘K (Mac) or Ctrl+K (Windows)
    │
    ├─ Nothing happens
    │   → Check: Is JavaScript enabled in the browser?
    │   → Check: Are there console errors? (DevTools → Console)
    │   → Cause: SearchDialog component may not be loading
    │       (it's rendered globally in the root layout)
    │
    └─ Dialog opens but shows an error
        → Check browser DevTools → Network tab for failed requests
        → The search uses a server action (not a REST API),
            so look for POST requests to the page URL
```

**Post-fix verification:**
- [ ] ⌘K opens the search dialog
- [ ] Typing a published post title returns the post in results
- [ ] Clicking a result navigates to the correct post page

---

## Severity Levels for Escalation

| Level | Definition | Response Time | Examples |
|-------|-----------|--------------|---------|
| **P1 — Site down** | Public site unreachable or returning 500s | Immediate | Database unreachable, Vercel outage |
| **P2 — Admin broken** | Public site works but admin is inaccessible | Within 1 hour | Login broken, session issues |
| **P3 — Degraded** | Site works but with issues | Within 24 hours | Slow pages, stale content, broken images |
| **P4 — Cosmetic** | Minor visual or non-functional issues | Next maintenance window | Styling bugs, typos |

### P1 Quick Checklist

1. Check `/api/health` — does it return 200?
2. Check [vercel.com/status](https://www.vercel-status.com/) — is Vercel up?
3. Check [status.neon.tech](https://status.neon.tech/) — is Neon up?
4. If bad deployment → **Instant rollback:** Vercel Dashboard → Deployments → previous green deployment → **Promote to Production**.
5. If database down → ISR-cached pages may still serve. Wait for provider recovery.

---

**See also:** [[deployment]] for environment setup and rollback procedures · [[database-management]] for database operations and backup/restore
