---
title: "Getting Started"
description: "Clone, install, and see your blog running locally in under 5 minutes"
category: user
created: 2025-01-15
updated: 2025-01-15
---

# Getting Started

In 5 minutes, you'll have a fully functional blog running on your machine — complete with a sample post, dark mode, command palette search, and a responsive mobile layout.

## Prerequisites

Before you begin, make sure you have:

- **Node.js 18+** — run `node -v` to check
- **Git** — to clone the repository
- **A PostgreSQL database** — you'll need a connection string

> [!tip] Fastest database setup
> Sign up at [neon.tech](https://neon.tech) (free tier). Create a project, and you'll have a PostgreSQL connection string in under 60 seconds. No local database installation required.

## Quick start

### Step 1 — Clone and install

```bash
git clone https://github.com/japperJ/JP-MyBlog.git
cd JP-MyBlog
npm install
```

### Step 2 — Configure your environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your values:

```env
DATABASE_URL="postgresql://neondb_owner:abc123@ep-cool-dawn-456789.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MFA_TOKEN_SECRET="k7Xp2mQ9vL4wR8nF3jH6tY1cB5gA0dE"
```

> [!warning] DATABASE_URL format matters
> The connection string must start with `postgresql://` and include `?sslmode=require` for hosted databases like Neon. A missing `sslmode` parameter causes silent connection failures.

Here's what each variable does:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string — where your posts, users, and sessions live |
| `NEXT_PUBLIC_APP_URL` | Your blog's base URL. Set to `http://localhost:3000` for local dev. On Vercel, you can leave it unset — the app detects the deployment URL automatically. |
| `MFA_TOKEN_SECRET` | Signs MFA (Multi-Factor Authentication) challenge tokens. Use any random 32+ character string. On Vercel, this must persist across redeploys. |

### Step 3 — Set up the database

```bash
npm run db:push && npm run db:seed
```

This creates all the tables in your database and populates it with an admin user, sample categories, tags, and a starter blog post.

### Step 4 — Start the dev server

```bash
npm run dev
```

### Step 5 — Open your blog

Navigate to **http://localhost:3000** in your browser.

## What you should see

Your blog is running. Here's what to look for:

- **Homepage** — a hero section with the sample post "Building Modern AI Applications with Next.js", plus latest posts below
- **Dark mode** — the site loads in dark theme by default. Click the sun/moon icon in the top-right corner to toggle between dark and light mode
- **Footer** — scroll down to see the four-column footer with navigation links, social icons, and an RSS feed link

> [!note] Explore these features right now
> Try these interactions to confirm everything is working:
>
> - **⌘K search** (Ctrl+K on Windows/Linux) — opens a command palette that searches across all published posts by title, excerpt, and content
> - **Mobile navigation** — resize your browser below 768px width to see the hamburger menu with a slide-out navigation sheet
> - **Category filter pills** — visit `/blog` and click the category buttons to filter posts
> - **Back-to-top button** — scroll down on any page and a button appears in the bottom-right corner to jump back to the top

## Log in to the admin dashboard

Navigate to `/admin/login` and sign in with the seeded admin account:

- **Email:** `admin@aicodingblog.com`
- **Password:** `admin123`

From here you can create posts, manage categories and tags, upload media (locally only), and configure your profile.

> [!warning] Change the default password
> The seed credentials are meant for initial setup. Go to **Settings** in the admin panel to update your profile, or create a new user under **Users** and delete the default account.

## What's next?

- **[[writing-posts]]** — learn how to create, format, and publish blog posts through the admin panel
- **[[customization]]** — change the site name, theme, footer links, and author profile to make the blog yours
- **[[troubleshooting]]** — if something didn't work during setup, find your symptom here
