# JP MyBlog — Copilot Instructions

This repository is a Next.js 15 + Prisma + PostgreSQL blog application. Keep guidance here short and operational: point to the authoritative docs instead of restating them.

## Start here

Before making changes, review the docs that already define the project contract:

- `README.md` — deployment contract, environment variables, readiness gates, and local setup
- `docs/technical/architecture.md` — system boundaries and invariants
- `docs/technical/auth-system.md` — auth, MFA, and cookie behavior
- `docs/technical/deployment-model.md` — hosted/runtime constraints and env-var rules
- `docs/technical/api-reference.md` — endpoint behavior and request contracts
- `docs/admin/deployment.md` and `docs/admin/database-management.md` — operational procedures
- `docs/user/getting-started.md` and `docs/user/troubleshooting.md` — user-facing setup and common fixes

When adding or updating docs, follow the standards in `.github/instructions/`:

- `admin-docs.instructions.md`
- `technical-docs.instructions.md`
- `user-docs.instructions.md`

## Commands that matter

Use the existing npm scripts instead of inventing new workflows:

- `npm run typecheck` — runs `prisma generate` and `tsc --noEmit`
- `npm run db:validate` — validates the Prisma schema
- `npm run db:generate` — refreshes the Prisma client
- `npm run db:push` — applies the schema to the database; this repo does not rely on checked-in migrations
- `npm run db:seed` — seeds the default admin user and starter content
- `npm run build` — production build; it depends on a reachable database
- `npm run readiness:preflight` — repeatable preflight gate for readiness checks
- `npm test` — Playwright suite
- `npm run test:smoke:local` / `npm run test:smoke:hosted` — local and hosted smoke validation

If `DATABASE_URL` is missing or unreachable, say the environment is blocked rather than treating the build as a soft pass.

## Project conventions

- Treat `prisma/schema.prisma` as the source of truth. This project uses `db:push` rather than a migration-first workflow.
- In App Router pages and route handlers, `params` and `searchParams` are commonly typed as `Promise<...>` and awaited.
- Keep auth and session behavior host-scoped; cookies are intentionally host-only.
- Do not rely on filesystem uploads in hosted environments. Vercel-hosted deployments intentionally reject `/api/upload` writes.
- Keep admin validation in the Node runtime path; avoid self-fetch patterns from middleware.
- Reuse shared helpers for blog thumbnails, markdown, and UI behavior instead of duplicating fallback logic.

## How to work in this repo

- Make small, testable changes and validate them with the relevant script or test file.
- Prefer existing components, server actions, route handlers, and helpers over new abstractions when the repo already has a pattern.
- If a change affects behavior, add or update tests in the closest existing test suite, especially Playwright coverage for admin or blog flows.
- For documentation changes, link to the authoritative doc instead of copying its content into a new place.

## Where to look first by topic

- **Architecture / system behavior** → `docs/technical/architecture.md`
- **Auth / MFA / sessions** → `docs/technical/auth-system.md`
- **Deployment / Vercel / env vars** → `docs/technical/deployment-model.md`
- **API behavior** → `docs/technical/api-reference.md`
- **Admin operations** → `docs/admin/`
- **User onboarding and troubleshooting** → `docs/user/`

## Common pitfalls

- A build is only meaningful when it can reach PostgreSQL.
- Hosted uploads are intentionally disabled until object storage exists.
- Prisma client generation matters after schema changes; keep `npm run typecheck` in the loop.
- Session behavior is origin-specific; localhost and preview URLs do not share cookies.

## If you need more context

Use the repo docs first, then inspect the relevant app, component, `lib/`, or `prisma/` files. Avoid embedding long explanations here when a dedicated document already exists.