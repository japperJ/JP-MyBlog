# Customizing Your Blog

After this guide, you'll know how to change your blog's name, metadata, author profiles, OG images, and theme to make it your own.

## Site name and metadata

The site-wide name, description, and SEO metadata are defined in the root layout at `app/layout.tsx`. To change them:

1. Open `app/layout.tsx`.
2. Find the `metadata` export and update:

```typescript
export const metadata: Metadata = {
  title: {
    default: "Your Blog Name",           // appears in browser tabs
    template: "%s | Your Blog Name",     // pattern for post pages
  },
  description: "Your blog description for search engines",
  keywords: ["your", "keywords", "here"],
  authors: [{ name: "Your Name" }],
  creator: "Your Name",
  openGraph: {
    title: "Your Blog Name",
    description: "Your blog description",
    siteName: "Your Blog Name",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Blog Name",
    description: "Your blog description",
  },
};
```

3. Update the `websiteJsonLd` object in the same file to match:

```typescript
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Your Blog Name",
  // ... rest of the object
};
```

4. Commit and redeploy. The changes take effect on the next build.

## Setting your production URL

The blog derives its canonical URLs, sitemap, RSS feed, and OG image links from the configured origin. You have two options:

- **On Vercel (no custom domain):** Leave `NEXT_PUBLIC_APP_URL` unset. The app reads `VERCEL_URL` automatically.
- **With a custom domain:** Set `NEXT_PUBLIC_APP_URL` in your Vercel environment variables to your domain (e.g., `https://myblog.com`).

For local development, keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` in your `.env.local`.

## Author profile

Update your author profile through the admin dashboard:

1. Log in at `/admin/login`.
2. Go to **Settings**.
3. Update your **name**, **bio**, and **avatar URL**.
4. Click **Save**.

Your author information appears on every post you write, including in the JSON-LD structured data (BlogPosting schema — metadata that helps Google display rich search results) that search engines consume.

## OG images (social sharing previews)

When someone shares a post on Twitter, Discord, or Slack, they see a generated Open Graph image. The OG image pipeline:

- Generates a 1200×630 image dynamically at `/api/og`
- Includes the post title, excerpt, category, and your blog's hostname
- Uses a purple gradient design with white text
- Falls back to the post's cover image if one is set

You don't need to create OG images manually — they're generated automatically for every published post.

To customize the OG image design, edit `app/api/og/route.tsx`. The image is built with `@vercel/og` using JSX-like syntax (it runs on the Edge Runtime and renders to an image).

## Theme

The blog ships with a dark theme by default, powered by `next-themes`. The theme provider is configured in `app/layout.tsx`:

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
```

Options:
- `defaultTheme="dark"` — change to `"light"` or `"system"` to match the visitor's OS preference
- `enableSystem` — when `true`, respects the user's OS dark/light mode setting

The styling is built on Tailwind CSS with the `tailwindcss-animate` plugin. Global styles live in `app/globals.css`. To change colors, fonts, or spacing, edit your Tailwind configuration in `tailwind.config.ts`.

### Fonts

The blog uses two Google Fonts loaded via `next/font`:

- **Inter** — body text (variable: `--font-inter`)
- **JetBrains Mono** — code blocks and monospace elements (variable: `--font-jetbrains-mono`)

To change fonts, update the imports in `app/layout.tsx`.

## Robots and sitemap

The blog automatically generates:

- **`/robots.txt`** — allows all crawlers except for `/admin/` and `/api/auth/` paths (see `app/robots.ts`)
- **`/sitemap.xml`** — includes all published posts and categories with last-modified dates (see `app/sitemap.ts`)
- **`/feed.xml`** — RSS feed of the 20 most recent published posts

These regenerate on each request based on your current content. No manual maintenance required.

## What's next?

- [Write your first post](./writing-posts.md) if you haven't already
- [Troubleshoot common issues](./troubleshooting.md) if something isn't working as expected
- [Technical architecture](../technical/architecture.md) if you want to understand how the pieces fit together
