---
title: "API Reference"
description: "Complete catalog of all API routes, server actions, auth requirements, request/response shapes, and rate limiting"
category: technical
created: 2025-07-26
updated: 2025-07-26
---

# API Reference

This document catalogs every HTTP endpoint and server action in the application. All routes live under `app/api/`. Authentication is via an `auth_session` cookie validated by helper functions in `lib/auth.ts`.

## Invariants

> [!important] Auth contract
> - **`requireAuth()`** — validates the session cookie against the database. Any authenticated user (admin or editor) passes.
> - **`requireAdmin()`** — calls `requireAuth()` then checks `user.role === "admin"`. Only admins pass.
> - **Unauthenticated routes** — no cookie check. These are public.

> [!important] Response contract
> - All endpoints return JSON (`Content-Type: application/json`) unless noted otherwise.
> - Error responses follow the shape `{ error: string }` with an appropriate HTTP status code.
> - Successful mutations return the created/updated resource or `{ success: true }`.

## Auth Patterns

Two auth levels exist, both defined in `lib/auth.ts`:

| Level | Function | Who passes | Used by |
|---|---|---|---|
| Authenticated | `requireAuth()` | Any user with a valid, non-expired session | Post/Category/Tag CRUD, upload, MFA management |
| Admin | `requireAdmin()` | Users with `role === "admin"` only | User management (`/api/admin/users/*`) |

Session mechanism: The `auth_session` cookie contains a 32-byte random hex token. `requireAuth()` looks up this token in the `sessions` table, checks `expiresAt`, and returns the associated user.

## Rate Limiting

> [!warning] In-process only
> Rate limiting uses an in-memory `Map` in `lib/rate-limit.ts`. It resets on serverless cold starts and does not share state across instances. Acceptable for Vercel Hobby (single instance).

| Endpoint | Limit | Window | Key |
|---|---|---|---|
| `POST /api/auth/login` | 5 attempts | 60 seconds | Client IP |
| `POST /api/auth/mfa/verify` | 5 attempts | 60 seconds | Client IP |
| `POST /api/auth/mfa/disable` | 5 attempts | 60 seconds | Client IP |

Response when rate limited: `429 Too Many Requests` with `{ error: "Too many attempts. Please try again later." }`.

---

## Content APIs

These endpoints manage posts, categories, and tags. Write operations require authentication.

### `GET /api/posts` — List posts

- **Auth:** None (public)
- **Source:** `app/api/posts/route.ts`

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Results per page (max 100) |
| `published` | string | — | `"true"` to filter published only |
| `category` | string | — | Category slug to filter by |
| `tag` | string | — | Tag slug to filter by |
| `search` | string | — | Text search across title, content, excerpt |

**Response:**

```json
{
  "posts": [
    {
      "id": "cuid",
      "title": "Post Title",
      "slug": "post-title",
      "excerpt": "Short description",
      "coverImage": "https://example.com/image.jpg",
      "published": true,
      "featured": false,
      "views": 42,
      "readingTime": 5,
      "publishedAt": "2025-01-15T00:00:00.000Z",
      "createdAt": "...",
      "updatedAt": "...",
      "author": { "name": "Admin", "avatar": null },
      "categories": [{ "category": { "id": "...", "name": "Tech", "slug": "tech" } }],
      "tags": [{ "tag": { "id": "...", "name": "React", "slug": "react" } }]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

### `POST /api/posts` — Create a post

- **Auth:** `requireAuth()`
- **Source:** `app/api/posts/route.ts`

**Request body (Zod-validated):**

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | Yes | Max 200 characters |
| `content` | string | Yes | Markdown body |
| `excerpt` | string | No | |
| `coverImage` | string | No | Must be `https://` URL or `/uploads/` path |
| `published` | boolean | No | Default `false` |
| `featured` | boolean | No | Default `false` |
| `categoryIds` | string[] | No | Array of category CUIDs |
| `tagIds` | string[] | No | Array of tag CUIDs |

> [!note] Auto-generated fields
> - `slug` — auto-generated from title via `slugify()`. Duplicate slugs return `400`.
> - `readingTime` — calculated at 200 words per minute.
> - `publishedAt` — set to `now()` when `published` is `true`.

**Response:** `201` with full post object (includes author, categories, tags).

**Errors:** `400` (validation failure or duplicate slug), `401` (not authenticated).

**Side effects:** Calls `revalidatePath("/")` and `revalidatePath("/blog")` to bust ISR cache.

---

### `GET /api/posts/[id]` — Get post by ID

- **Auth:** None (public)
- **Source:** `app/api/posts/[id]/route.ts`
- **Response:** Full post with `author` (name, avatar, bio), `categories`, `tags`.
- **Errors:** `404` if not found.

---

### `PATCH /api/posts/[id]` — Update a post

- **Auth:** `requireAuth()`
- **Source:** `app/api/posts/[id]/route.ts`

**Request body (Zod-validated, all fields optional):**

| Field | Type | Notes |
|---|---|---|
| `title` | string | Re-generates slug if changed |
| `content` | string | Re-calculates readingTime if changed |
| `excerpt` | string | |
| `coverImage` | string | |
| `published` | boolean | Sets `publishedAt` on first publish |
| `featured` | boolean | |
| `categoryIds` | string[] | Replaces all — deletes old junction rows, creates new |
| `tagIds` | string[] | Replaces all — deletes old junction rows, creates new |

**Response:** Updated post object with relations.

**Side effects:** Calls `revalidatePath()` for `/`, `/blog`, and `/blog/[slug]`.

---

### `DELETE /api/posts/[id]` — Delete a post

- **Auth:** `requireAuth()`
- **Source:** `app/api/posts/[id]/route.ts`

> [!warning] Destructive
> Cascade-deletes all `PostCategory` and `PostTag` junction rows for this post.

**Response:** `{ success: true }`

**Side effects:** Calls `revalidatePath()` for `/`, `/blog`, and `/blog/[slug]`.

---

### `GET /api/posts/slug/[slug]` — Get post by slug

- **Auth:** None (public)
- **Source:** `app/api/posts/slug/[slug]/route.ts`

**Response:** Full post with author, categories, tags.

> [!warning] View count side effect
> This endpoint **increments `views` by 1** on every call — including bots, ISR revalidation, and page reloads. There is no deduplication. This is a known limitation documented in [[architecture#known-limitations]].

---

### `GET /api/categories` — List categories

- **Auth:** None (public)
- **Source:** `app/api/categories/route.ts`

**Response:**

```json
[
  {
    "id": "cuid",
    "name": "Technology",
    "slug": "technology",
    "description": "Posts about tech",
    "_count": { "posts": 12 }
  }
]
```

---

### `POST /api/categories` — Create a category

- **Auth:** `requireAuth()`
- **Source:** `app/api/categories/route.ts`

**Request body:**

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |
| `description` | string | No |

> [!note] Slug auto-generation
> The `slug` is auto-generated from `name`. Not user-supplied on creation.

**Response:** `201` with category object.

---

### `PATCH /api/categories/[id]` — Update a category

- **Auth:** `requireAuth()`
- **Source:** `app/api/categories/[id]/route.ts`

**Request body (all optional):**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Slug regenerated if name changes |
| `slug` | string | Can be set directly |
| `description` | string | |

---

### `DELETE /api/categories/[id]` — Delete a category

- **Auth:** `requireAuth()`
- **Source:** `app/api/categories/[id]/route.ts`
- **Response:** `{ message: "Category deleted successfully" }`

---

### `GET /api/tags` — List tags

- **Auth:** None (public)
- **Source:** `app/api/tags/route.ts`

**Response:** Array of tags with `_count.posts`.

---

### `POST /api/tags` — Create a tag

- **Auth:** `requireAuth()`
- **Source:** `app/api/tags/route.ts`

**Request body:**

| Field | Type | Required |
|---|---|---|
| `name` | string | Yes |

Slug auto-generated from name.

**Response:** `201` with tag object.

---

### `PATCH /api/tags/[id]` — Update a tag

- **Auth:** `requireAuth()`
- **Source:** `app/api/tags/[id]/route.ts`

**Request body (all optional):**

| Field | Type |
|---|---|
| `name` | string |
| `slug` | string |

---

### `DELETE /api/tags/[id]` — Delete a tag

- **Auth:** `requireAuth()`
- **Source:** `app/api/tags/[id]/route.ts`
- **Response:** `{ message: "Tag deleted successfully" }`

---

## Auth APIs

These endpoints handle login, logout, session validation, and MFA lifecycle.

### `POST /api/auth/login` — Authenticate user

- **Auth:** None
- **Rate limit:** 5 attempts / 60s per IP
- **Source:** `app/api/auth/login/route.ts`

**Request body:**

| Field | Type | Required |
|---|---|---|
| `email` | string | Yes |
| `password` | string | Yes |

**Response (no MFA):**

```json
{
  "success": true,
  "user": { "id": "cuid", "email": "admin@example.com", "name": "Admin", "role": "admin" }
}
```

Sets `auth_session` cookie (httpOnly, secure in production, sameSite strict, 7-day expiry).

**Response (MFA enabled):**

```json
{
  "mfaRequired": true,
  "mfaToken": "base64url-encoded-signed-token"
}
```

No session created yet — client must call `/api/auth/mfa/verify` with the token.

> [!important] MFA flow fork
> If `user.mfaEnabled === true`, login returns an `mfaToken` instead of creating a session. The token is HMAC-SHA256 signed with `MFA_TOKEN_SECRET`, contains the user ID and a 10-minute expiry. The client presents this token along with a TOTP code to `/api/auth/mfa/verify`.

**Errors:**
- `401` — Invalid credentials
- `429` — Rate limited
- `500` — Config error (missing `DATABASE_URL` or `MFA_TOKEN_SECRET` on Vercel)

---

### `POST /api/auth/logout` — Destroy session

- **Auth:** Cookie-based (destroys the session matching the cookie)
- **Source:** `app/api/auth/logout/route.ts`
- **Behavior:** Deletes session record from DB, clears `auth_session` cookie.
- **Response:** `{ success: true, message: "Logged out successfully" }`

---

### `GET /api/auth/session` — Check current session

- **Auth:** Cookie-based
- **Source:** `app/api/auth/session/route.ts`

**Response (valid session):**

```json
{
  "authenticated": true,
  "user": {
    "id": "cuid",
    "email": "admin@example.com",
    "name": "Admin",
    "role": "admin",
    "mfaEnabled": true,
    "mfaRequired": false
  }
}
```

**Response (invalid/expired):** `401` with `{ authenticated: false }`.

---

### `POST /api/auth/mfa/generate` — Generate MFA setup QR code

- **Auth:** `requireAuth()`
- **Source:** `app/api/auth/mfa/generate/route.ts`
- **Behavior:** Generates TOTP secret, stores it in `user.pendingMfaSecret`, returns QR code.
- **Response:**

```json
{
  "secret": "BASE32_ENCODED_SECRET",
  "qrCode": "data:image/png;base64,..."
}
```

---

### `POST /api/auth/mfa/enable` — Enable MFA

- **Auth:** `requireAuth()`
- **Source:** `app/api/auth/mfa/enable/route.ts`

**Request body:**

| Field | Type | Description |
|---|---|---|
| `token` | string | 6-digit TOTP code from authenticator app |

**Behavior:** Verifies TOTP against `pendingMfaSecret`. On success: promotes to `mfaSecret`, sets `mfaEnabled = true`, invalidates all other sessions for this user.

**Response:** `{ success: true, message: "MFA enabled successfully" }`

---

### `POST /api/auth/mfa/disable` — Disable MFA

- **Auth:** `requireAuth()`
- **Rate limit:** 5 attempts / 60s per IP
- **Source:** `app/api/auth/mfa/disable/route.ts`

**Request body:**

| Field | Type | Description |
|---|---|---|
| `token` | string | 6-digit TOTP code (proves authenticator access) |

**Behavior:** Verifies TOTP, clears `mfaSecret`, sets `mfaEnabled = false`, invalidates all other sessions.

**Response:** `{ success: true, message: "MFA disabled successfully" }`

---

### `POST /api/auth/mfa/verify` — Complete MFA login

- **Auth:** None (uses signed `mfaToken` from login response)
- **Rate limit:** 5 attempts / 60s per IP
- **Source:** `app/api/auth/mfa/verify/route.ts`

**Request body:**

| Field | Type | Description |
|---|---|---|
| `mfaToken` | string | Signed token from login response |
| `token` | string | 6-digit TOTP code |

**Behavior:**
1. Verifies `mfaToken` HMAC signature using `MFA_TOKEN_SECRET`.
2. Checks token expiry (10 minutes TTL).
3. Verifies TOTP code against `user.mfaSecret`.
4. Creates session, sets `auth_session` cookie.

**Response:** `{ success: true, user: { id, email, name, role } }` + sets cookie.

**Errors:**
- `400` — Invalid or expired `mfaToken`, invalid TOTP code
- `429` — Rate limited

---

## Admin APIs

These endpoints manage users and require admin role.

### `GET /api/admin/users` — List all users

- **Auth:** `requireAdmin()`
- **Source:** `app/api/admin/users/route.ts`

**Response:**

```json
{
  "users": [
    {
      "id": "cuid",
      "email": "admin@example.com",
      "name": "Admin",
      "role": "admin",
      "mfaEnabled": true,
      "mfaRequired": false,
      "createdAt": "2025-01-15T00:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/admin/users` — Create a user

- **Auth:** `requireAdmin()`
- **Source:** `app/api/admin/users/route.ts`

**Request body:**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | Yes | Must be unique |
| `name` | string | Yes | |
| `password` | string | Yes | Hashed with bcrypt (10 rounds) |
| `role` | string | No | `"admin"` or `"editor"`, defaults to `"admin"` |

**Response:** `201` with `{ user: { id, email, name, role, mfaEnabled, createdAt } }`.

---

### `PATCH /api/admin/users/[id]` — Admin MFA management

- **Auth:** `requireAdmin()`
- **Source:** `app/api/admin/users/[id]/route.ts`

**Request body:**

| Field | Type | Values |
|---|---|---|
| `action` | string | `"disable-mfa"`, `"require-mfa"`, `"unrequire-mfa"` |

**Behavior by action:**

| Action | Effect | Guard |
|---|---|---|
| `disable-mfa` | Clears `mfaSecret`, sets `mfaEnabled = false`, invalidates target's sessions | Cannot target yourself |
| `require-mfa` | Sets `mfaRequired = true` | — |
| `unrequire-mfa` | Sets `mfaRequired = false` | — |

---

### `DELETE /api/admin/users/[id]` — Delete a user

- **Auth:** `requireAdmin()`
- **Source:** `app/api/admin/users/[id]/route.ts`

> [!warning] Self-delete guard
> You cannot delete your own account. The endpoint checks `userId !== currentUser.id` and returns `400` if violated.

**Behavior:** Cascade-deletes the user's sessions and posts.

**Response:** `{ success: true, message: "User deleted successfully" }`

---

## Infrastructure APIs

### `GET /api/health` — Health check

- **Auth:** None
- **Source:** `app/api/health/route.ts`
- **Response:** `{ status: "ok" }` (200)
- **Use case:** Uptime monitoring, deployment verification.

---

### `POST /api/upload` — Upload image file

- **Auth:** `requireAuth()`
- **Source:** `app/api/upload/route.ts`

> [!warning] Disabled on Vercel
> Returns `501 Not Implemented` when `VERCEL` or `VERCEL_URL` environment variables are detected. Vercel's ephemeral filesystem discards uploaded files on container recycle. Use HTTPS image URLs instead.

**Request:** `multipart/form-data` with `file` field.

**Validation:**
- File types: JPEG, PNG, GIF, WebP only (magic byte verification)
- Max size: 5 MB

**Response (local dev only):** `201` with `{ url: "/uploads/filename.jpg" }` — saves to `public/uploads/` with timestamp prefix.

---

### `GET /api/og` — Dynamic OG image generation

- **Runtime:** Edge
- **Auth:** None
- **Source:** `app/api/og/route.tsx`

**Query parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Post title |
| `excerpt` | string | No | Truncated to 150 characters |
| `category` | string | No | Shown below site name |

**Response:** 1200×630 PNG image with purple gradient background, blog name, title, and excerpt.

**Performance:** Edge runtime cold start ~50–200ms. Cached by Vercel CDN after first generation for identical parameters.

---

## Server Actions

### `searchPosts(query: string)` — ⌘K search

- **Location:** `app/actions/search.ts`
- **Auth:** None (searches only published posts)
- **Invoked by:** `SearchDialog` component (cmdk-based ⌘K palette)

**Behavior:**
1. Rejects queries shorter than 2 characters.
2. Searches `title`, `excerpt`, and `content` fields using Prisma `contains` + `mode: insensitive`.
3. Returns up to 8 results.

> [!note] Not full-text search
> Despite `fullTextSearch` being enabled as a Prisma preview feature, this action uses simple `contains` matching. This is adequate for the expected post volume (<1000 posts). See [[design-decisions#search]].

**Return type:**

```typescript
type SearchResult = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  categories: { category: { name: string; slug: string } }[];
};
```

---

## Route Summary

### Content APIs — 14 handlers across 5 route files

| Method | Path | Auth | Source |
|---|---|---|---|
| GET | `/api/posts` | None | `app/api/posts/route.ts` |
| POST | `/api/posts` | `requireAuth()` | `app/api/posts/route.ts` |
| GET | `/api/posts/[id]` | None | `app/api/posts/[id]/route.ts` |
| PATCH | `/api/posts/[id]` | `requireAuth()` | `app/api/posts/[id]/route.ts` |
| DELETE | `/api/posts/[id]` | `requireAuth()` | `app/api/posts/[id]/route.ts` |
| GET | `/api/posts/slug/[slug]` | None | `app/api/posts/slug/[slug]/route.ts` |
| GET | `/api/categories` | None | `app/api/categories/route.ts` |
| POST | `/api/categories` | `requireAuth()` | `app/api/categories/route.ts` |
| PATCH | `/api/categories/[id]` | `requireAuth()` | `app/api/categories/[id]/route.ts` |
| DELETE | `/api/categories/[id]` | `requireAuth()` | `app/api/categories/[id]/route.ts` |
| GET | `/api/tags` | None | `app/api/tags/route.ts` |
| POST | `/api/tags` | `requireAuth()` | `app/api/tags/route.ts` |
| PATCH | `/api/tags/[id]` | `requireAuth()` | `app/api/tags/[id]/route.ts` |
| DELETE | `/api/tags/[id]` | `requireAuth()` | `app/api/tags/[id]/route.ts` |

### Auth APIs — 7 handlers across 7 route files

| Method | Path | Auth | Rate Limited |
|---|---|---|---|
| POST | `/api/auth/login` | None | ✅ 5/60s |
| POST | `/api/auth/logout` | Cookie | — |
| GET | `/api/auth/session` | Cookie | — |
| POST | `/api/auth/mfa/generate` | `requireAuth()` | — |
| POST | `/api/auth/mfa/enable` | `requireAuth()` | — |
| POST | `/api/auth/mfa/disable` | `requireAuth()` | ✅ 5/60s |
| POST | `/api/auth/mfa/verify` | None (mfaToken) | ✅ 5/60s |

### Admin APIs — 4 handlers across 2 route files

| Method | Path | Auth |
|---|---|---|
| GET | `/api/admin/users` | `requireAdmin()` |
| POST | `/api/admin/users` | `requireAdmin()` |
| PATCH | `/api/admin/users/[id]` | `requireAdmin()` |
| DELETE | `/api/admin/users/[id]` | `requireAdmin()` |

### Infrastructure — 3 handlers across 3 route files

| Method | Path | Auth | Runtime |
|---|---|---|---|
| GET | `/api/health` | None | Node.js |
| POST | `/api/upload` | `requireAuth()` | Node.js |
| GET | `/api/og` | None | Edge |

### Server Actions — 1

| Action | Location | Auth |
|---|---|---|
| `searchPosts(query)` | `app/actions/search.ts` | None |

**Total: 28 HTTP handlers + 1 server action across 19 route files.**

---

## Related Documentation

- [[architecture]] — System overview, rendering strategy, data model
- [[auth-system]] — Deep dive into session lifecycle, MFA implementation, rate limiting
- [[design-decisions]] — Why custom auth, why Prisma `contains` search, why no SDK sharing
