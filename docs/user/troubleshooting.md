---
title: "Troubleshooting"
description: "Find your symptom, understand why it happens, and fix it"
category: user
created: 2025-01-15
updated: 2025-01-15
---

# Troubleshooting

Find your symptom below, understand why it happens, fix it, and prevent it from recurring.

---

## Login hangs or redirects in a loop

**What you see:** Clicking "Login" on `/admin/login` either hangs indefinitely or keeps redirecting you back to the login page.

**Why this happens:** The session cookie is host-only. If your browser has a stale cookie from a different preview URL, or the database session record has expired (sessions last 7 days), the middleware sees a cookie but the admin layout can't find a valid session — so it redirects back to login.

**Fix:**
1. Clear your cookies for the blog's domain (or use an incognito window).
2. Try logging in again at `/admin/login`.
3. If that doesn't work, check that `DATABASE_URL` in your Vercel environment variables points to a reachable database — the session lookup requires a database connection.

> [!tip] Quick check
> Open your browser's dev tools → Application → Cookies. Look for `auth_session`. If it exists but you're still being redirected, the session has expired server-side. Clearing the cookie and logging in fresh resolves it.

**Prevent it:** Each Vercel preview URL is a separate login scope. When the URL changes (new deployment), you need to log in again. This is by design.

---

## 404 on new posts

**What you see:** You published a post through the admin dashboard, but visiting `/blog/your-new-slug` returns a 404 page.

**Why this happens:** The blog uses ISR (Incremental Static Regeneration) with a 60-second revalidation window. New posts that didn't exist at build time are rendered on-demand, but the first request might briefly 404 while the page is being generated.

**Fix:**
1. Wait 60 seconds and refresh the page. ISR serves the new page on the next request.
2. If the post still doesn't appear, verify in the admin dashboard that the post is actually **Published** (not Draft).
3. Check that the slug matches exactly — slugs are case-sensitive.

**Prevent it:** Always confirm the "Published" toggle is on before saving. The `dynamicParams = true` setting ensures new slugs are rendered on demand — a full redeploy is never required for new content.

---

## Search not finding my post

**What you see:** You press ⌘K (Ctrl+K on Windows/Linux) and search for a post, but it doesn't appear in the results.

**Why this happens:** The ⌘K search only returns **published** posts. Draft posts are excluded from search results entirely. The search also requires a minimum of 2 characters.

**Fix:**
1. Confirm the post has the **Published** toggle set to on in the admin dashboard.
2. Make sure your search query is at least 2 characters long.
3. Try searching by a word from the title, excerpt, or body — search covers all three fields.

> [!note]
> Search results appear instantly from the database — there's no indexing delay. If the post is published and still not appearing, check that the database connection is working (see [[#Database connection errors]]).

---

## Code blocks look wrong

**What you see:** Code blocks in your posts appear without syntax highlighting, or the colors don't match the site's dark/light theme.

**Why this happens:** Syntax highlighting relies on a CDN-loaded highlight.js stylesheet. If the CDN is unreachable (network issues, ad blocker, or corporate firewall), code blocks render as plain monospace text. The theme switching between `github-dark` and `github` styles is handled by swapping a `<link>` tag — if JavaScript is disabled, it may not switch.

**Fix:**
1. Check your browser's network tab for blocked requests to `cdnjs.cloudflare.com`.
2. Disable any ad blocker or content filter temporarily to confirm it's not blocking the CDN stylesheet.
3. Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R) to reload the stylesheet.

**Prevent it:** If you're behind a restrictive firewall, the code blocks still render correctly as text — only the color highlighting is affected.

---

## Images not loading

**What you see:** Cover images on posts show as broken images or don't appear at all.

> [!warning] Vercel uploads are disabled
> File uploads via `/api/upload` are disabled on Vercel because the serverless filesystem is read-only after deployment. If you uploaded an image locally and referenced it as `/uploads/filename.jpg`, that path doesn't exist on Vercel.

**Fix (on Vercel):**
1. Upload your image to an HTTPS-accessible host (Imgur, Cloudinary, or any CDN).
2. Copy the direct image URL (must start with `https://`).
3. Edit the post in the admin dashboard and paste the URL into the **Cover Image** field.
4. Save the post. The image renders immediately — `next/image` accepts any HTTPS source.

**Fix (locally):** Check that the file exists in `public/uploads/` and that you're using the correct filename.

**Prevent it:** On Vercel deployments, always use external HTTPS image URLs. Never reference `/uploads/` paths in posts intended for production.

---

## Build failures

**What you see:** Vercel deploy fails with errors during `npm run build`, or `npm run readiness:preflight` fails locally.

### "DATABASE_URL is required"

The Prisma client needs `DATABASE_URL` at build time because the homepage and blog pages query the database during static generation.

**Fix:** Add `DATABASE_URL` to your Vercel project's environment variables (under Settings → Environment Variables). Make sure it's enabled for the **Preview** and/or **Production** environments.

### "Vercel-hosted deployments require an external PostgreSQL DATABASE_URL"

The `lib/prisma.ts` guard rejects `localhost` database URLs when running on Vercel.

**Fix:** Use your Neon (or other hosted PostgreSQL) connection string, not a `localhost` URL.

### Prisma schema validation errors

If you see `prisma validate` errors, the schema file may be out of sync with your database.

**Fix:**
```bash
npm run db:generate    # regenerate the Prisma client
npm run db:push        # push the schema to the database
```

### TypeScript errors

Run `npx tsc --noEmit` locally to see the exact errors. Fix them before pushing — Vercel runs `prisma generate && next build`, and `next build` includes type checking.

---

## Database connection errors

**What you see:** Pages fail to load with "Can't reach database server" or similar Prisma connection errors.

**Why this happens:**
- The `DATABASE_URL` is missing or incorrect
- The database provider (Neon, Supabase, etc.) has suspended the free-tier instance due to inactivity
- Network/firewall restrictions are blocking the connection

**Fix:**
1. Check that `DATABASE_URL` is set correctly — in `.env.local` for local dev, or in Vercel environment variables for deployments.
2. Log in to your database provider's dashboard and verify the database is active. Neon free-tier databases can suspend after 5 minutes of inactivity; they wake up automatically on the next connection, but the first request may be slow.
3. Test the connection locally:
   ```bash
   npx prisma db pull
   ```
   If this succeeds, your connection string is correct.

> [!tip]
> Neon free-tier databases auto-suspend after inactivity. The first request after wake-up takes 2–5 seconds — this is normal, not a bug.

**Prevent it:** Pin your Neon project to avoid auto-suspend if your provider supports it.

---

## MFA issues

**What you see:** After enabling MFA (Multi-Factor Authentication — time-based one-time passwords via an authenticator app), login fails or the MFA prompt doesn't appear.

**Why this happens:** The MFA token is signed with `MFA_TOKEN_SECRET`. If this secret differs between the server that started the login flow and the server that verifies the MFA code (e.g., after a redeploy), the token is rejected.

**Fix:**
1. Ensure `MFA_TOKEN_SECRET` is set as an environment variable in Vercel (not just locally).
2. The secret must be the same value across redeploys. Set it once and don't rotate it unless you want to invalidate all active MFA challenges.
3. If you're locked out, you'll need to disable MFA directly in the database:
   ```sql
   UPDATE users SET "mfaEnabled" = false, "mfaSecret" = NULL WHERE email = 'admin@aicodingblog.com';
   ```

> [!warning]
> The SQL command above disables MFA without requiring a TOTP code. Only use this as a last resort when you've lost access to your authenticator app.

---

## Preview URL shows stale content

**What you see:** You updated a post, but the live page still shows the old content.

**Why this happens:** ISR caches pages for up to 60 seconds. Additionally, Vercel's CDN may serve a cached response.

**Fix:**
1. Wait 60 seconds and hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R).
2. If using the admin API to update posts, the app calls `revalidatePath()` to bust the cache immediately — if this isn't happening, check the browser cache.

---

## What's next?

- **[[getting-started]]** — need to re-run the setup? The quick start guide walks you through it
- **[[writing-posts]]** — creating a post? The full writing guide is here
- If your issue isn't listed here, check the [[../admin/deployment|deployment guide]] for environment setup details
