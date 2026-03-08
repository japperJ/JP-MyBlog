# Implementation Notes

## Current deployment target

The app is currently aligned for:

- Vercel Hobby **Preview**
- Vercel **Development**
- local development from `upstream/JP-MyBlog/`

## Runtime contracts

### 1. Database contract

A single external PostgreSQL database is the active Phase 2 contract.

That contract now applies consistently across:

- Prisma datasource/runtime
- session storage
- MFA-related user state
- post, category, and tag CRUD

Hosted deployments fail fast if `DATABASE_URL` is missing or still points at `localhost`.

### 2. Auth and cookie contract

The app uses a database-backed `auth_session` cookie.

Cookie behavior:

- host-only cookie
- `httpOnly`
- `sameSite: "strict"`
- `secure` only in production
- same-origin session checks in middleware

Practical consequence:

- a localhost login does not carry to Vercel,
- one preview deployment does not share a session with another preview deployment,
- each deployment origin behaves as an independent admin session scope.

### 3. MFA contract

`MFA_TOKEN_SECRET` is now part of the explicit hosted environment surface.

Why:

- MFA login uses a short-lived signed challenge token between password login and TOTP verification.
- Hosted environments need one stable signing secret per deployment environment.
- Falling back to a random startup secret is acceptable only for non-hosted local workflows.

### 4. URL and metadata contract

The app no longer relies on hardcoded production domains.

These surfaces now use the configured or request-derived origin:

- root metadata
- post metadata
- sitemap
- RSS feed
- OG image footer/branding host

`NEXT_PUBLIC_APP_URL` remains the explicit public base URL for non-request contexts.

### 5. Upload contract

Filesystem uploads are not treated as a hosted capability.

Current policy:

- local/non-Vercel workflow: `/api/upload` can still write to `public/uploads`
- Vercel-hosted workflow: `/api/upload` returns a clear failure response
- editor workflow on Vercel: paste an external `https://...` image URL manually

### 6. Next.js deployment contract

`output: "standalone"` was removed.

Reason:

- standalone output is mainly useful for self-hosted/container deployment targets
- Vercel already handles Next.js tracing and deployment packaging natively

## Test model

Playwright is now aligned to the same runtime assumptions:

- local default base URL: `http://127.0.0.1:3000`
- hosted override: `PLAYWRIGHT_BASE_URL`
- admin tests log in before accessing protected routes
- API tests authenticate before protected mutations
- media/admin coverage checks for hosted upload limitation messaging

## Operational limitations still deferred

These are intentionally out of Phase 2 scope:

- object storage for hosted uploads
- production-grade distributed rate limiting
- baseline Prisma migrations checked into the repository
- session sharing across preview hosts or custom aliases

## Planning-environment note

No SQL tool was available in the planning environment used for this phase, so SQL-specific todos were not updated and no live database introspection was performed here.
