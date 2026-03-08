# Auth System Architecture

## Invariants

1. Session tokens are cryptographically random 32-byte hex strings, stored in the database, and looked up on every authenticated request.
2. Passwords are hashed with bcrypt (cost factor 10) and never stored or transmitted in plaintext.
3. Edge middleware never performs session validation — it only checks cookie existence.
4. Full session validation (database lookup, role check, MFA enforcement) runs exclusively in the Node.js runtime via the admin layout server component.
5. MFA challenge tokens are HMAC-SHA256 signed, bound to a user ID, and expire after 10 minutes.
6. Auth cookies are `httpOnly`, `sameSite: strict`, `path: /`, and host-only (no `domain` attribute).

## Authentication flow

### Login (without MFA)

```
POST /api/auth/login
  ├─ Validate email + password (bcrypt.compare)
  ├─ If user.mfaEnabled:
  │    └─ Return mfaToken (signed challenge) → redirect to MFA verify
  ├─ If no MFA:
  │    ├─ Create session record in database
  │    ├─ Set auth_session cookie
  │    └─ Return success → redirect to /admin
```

### Login (with MFA)

```
POST /api/auth/login
  ├─ Validate email + password
  ├─ Create HMAC-signed mfaToken (userId + expiry)
  └─ Return { mfaRequired: true, mfaToken }

POST /api/auth/mfa/verify
  ├─ Verify mfaToken signature + expiry
  ├─ Verify TOTP code against user.mfaSecret
  ├─ Create session record in database
  ├─ Set auth_session cookie
  └─ Return success → redirect to /admin
```

### Session validation (every admin request)

```
Edge Middleware (middleware.ts)
  ├─ /api/auth/* → pass through (no gate)
  ├─ /admin/login → pass through (add x-pathname header)
  ├─ /admin/* + no cookie → redirect to /admin/login
  └─ /admin/* + cookie exists → forward with x-pathname header

Admin Layout (app/admin/layout.tsx)
  ├─ pathname === /admin/login → render login page
  ├─ Call getSession() → Prisma lookup by token
  ├─ No valid session → redirect to /admin/login
  ├─ session.user.role check → deny /admin/users for non-admins
  └─ MFA enforcement → redirect to /admin/settings if mfaRequired && !mfaEnabled
```

## The self-fetch deadlock fix

**Problem:** An earlier design validated sessions in middleware by calling `fetch("/api/auth/session")`. On Vercel Hobby tier, this caused a deadlock:

1. Edge middleware sends a request to the same deployment's API route.
2. The Edge function holds one concurrency slot while waiting for the response.
3. The serverless function needs a slot to start — but only one is available on Hobby tier.
4. Both are stuck waiting. The request times out after 10 seconds.

**Symptom:** Admin pages hang for exactly 10 seconds, then return a 504 Gateway Timeout. Login works (middleware passes through `/api/auth/`), but every subsequent admin navigation fails.

**Detection:** Vercel function logs show the Edge middleware's fetch to `/api/auth/session` timing out. No corresponding serverless function invocation appears — it was never dispatched.

**Fix:** Removed all `fetch()` calls from middleware. The middleware now only checks `request.cookies.get("auth_session")`. Full session validation moved to `app/admin/layout.tsx`, which runs in the Node.js serverless runtime and calls Prisma directly — no HTTP round-trip, no concurrency conflict.

See `middleware.ts` lines 7–19 for the inline design rationale.

## Session cookie design

Defined in `lib/auth.ts`, the `getSessionCookieOptions` function:

```typescript
{
  httpOnly: true,           // not accessible via JavaScript
  secure: production,       // HTTPS-only in production
  sameSite: "strict",       // no cross-site requests
  expires: now + 7 days,    // session duration
  path: "/",                // available on all routes
  // No domain attribute → host-only cookie
}
```

**Why host-only (no `domain` attribute):** Each Vercel preview deployment gets a unique hostname. A `domain`-scoped cookie would leak sessions between preview URLs. Host-only cookies ensure each deployment is an isolated login scope.

**Trade-off:** Users must log in again when the preview URL changes. This is acceptable for a single-admin blog and is more secure than shared sessions.

## MFA implementation

### TOTP setup (`lib/mfa.ts`)

1. `generateMFASecret()` creates a random base32 secret via otplib.
2. `generateOTPAuthURL()` creates a standard `otpauth://` URI with issuer "AI Coding Blog".
3. `generateQRCode()` converts the URI to a data URL using the `qrcode` library.
4. The secret is stored as `user.pendingMfaSecret` until the user verifies a code.
5. On successful verification, `pendingMfaSecret` moves to `mfaSecret` and `mfaEnabled` is set to `true`.

### MFA challenge tokens (`lib/mfa-token.ts`)

Format: `base64url(userId|expiry|hmac-sha256(userId|expiry, MFA_TOKEN_SECRET))`

- **TTL:** 10 minutes (`TTL_MS = 10 * 60 * 1000`)
- **Signing:** HMAC-SHA256 with `MFA_TOKEN_SECRET`
- **Verification:** Timing-safe comparison via `crypto.timingSafeEqual`

**Why a signed token instead of a database record?** The MFA challenge is short-lived and stateless. A signed token avoids an extra database write/read for the challenge step. The HMAC binds the token to a specific user and expiry, preventing tampering.

**Hosted requirement:** `MFA_TOKEN_SECRET` must be set as an environment variable on Vercel. Without it, `getMfaTokenSecret()` throws at module load time for hosted deployments. Locally, it falls back to a random secret generated at startup — acceptable because local dev is single-process.

### Session invalidation after MFA changes

`destroyOtherSessions()` in `lib/auth.ts` deletes all sessions for a user except the current one. This is called after MFA enable/disable to ensure sessions created before the security change don't bypass the new MFA requirement.

## Password security

- **Hashing:** bcrypt with cost factor 10 (`bcrypt.hash(password, 10)`)
- **Verification:** `bcrypt.compare(password, hash)` — timing-safe by design
- **Storage:** Only the hash is stored in `user.passwordHash`

## Rate limiting on auth endpoints

`lib/rate-limit.ts` provides in-memory rate limiting keyed by client IP (from `x-forwarded-for` or `x-real-ip` headers). Auth endpoints use this to prevent brute-force attacks.

**Limitation:** In-memory rate limiting resets on serverless cold starts and doesn't share state across instances. Acceptable for Vercel Hobby (single instance), but a Redis-backed solution (e.g., Upstash) is needed for production scale.

## Source file reference

| File | Lines | Purpose |
|------|-------|---------|
| `middleware.ts` | 1–61 | Edge middleware: cookie-presence gate, `x-pathname` header injection |
| `app/admin/layout.tsx` | 1–61 | Server-side session validation, role-based access, MFA enforcement |
| `lib/auth.ts` | 1–154 | Session CRUD, password hashing, `requireAuth`/`requireAdmin`, `destroyOtherSessions` |
| `lib/mfa.ts` | 1–65 | TOTP secret generation, QR code generation, token verification |
| `lib/mfa-token.ts` | 1–79 | HMAC-signed MFA challenge tokens (create + verify) |
| `lib/rate-limit.ts` | 1–47 | In-memory rate limiter with IP extraction |
| `prisma/schema.prisma` | 16–48 | `User` model (MFA fields), `Session` model |

## Known failure modes

| Symptom | Root cause | Detection | Recovery |
|---------|-----------|-----------|----------|
| Admin pages hang for 10s then 504 | Self-fetch in middleware (if reintroduced) | Vercel function logs: Edge fetch timeout | Remove fetch from middleware; use layout validation |
| Login succeeds but admin redirects to login | Expired session in database | Check `sessions` table for matching token | Clear cookies, log in again |
| MFA verify returns "invalid token" | `MFA_TOKEN_SECRET` mismatch between login and verify | Compare env var across deployments | Set a stable `MFA_TOKEN_SECRET` in Vercel |
| MFA verify returns "invalid token" after 10 min | Token TTL expired | Check timestamp in decoded token | Restart the login flow |
| "Unauthorized" on admin API calls | Missing or expired `auth_session` cookie | Check cookie in browser DevTools | Log in again |
