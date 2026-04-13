---
title: "Customization"
description: "Change the theme, footer, metadata, author profile, and site branding without touching the core codebase"
category: user
created: 2025-01-15
updated: 2025-01-15
---

# Customization

After following this guide, you'll know every customization point in the blog — from changing the site name to modifying the footer's social links — so you can make it yours without reading source code.

## Theme switching

The blog ships with **dark mode as the default**. Readers toggle between dark and light mode using the sun/moon icon in the navigation bar.

The theme system uses `next-themes` with the `class` strategy, which means Tailwind's `dark:` variant drives all color changes. The theme provider in `app/layout.tsx` is configured as:

```typescript
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
```

You can change the default experience:

| Setting | Effect |
|---|---|
| `defaultTheme="dark"` | New visitors see dark mode (current default) |
| `defaultTheme="light"` | New visitors see light mode |
| `defaultTheme="system"` | Follows the visitor's operating system preference |

The `enableSystem` flag means that even with a `defaultTheme` set, readers who explicitly choose "system" in a theme picker would follow their OS. The toggle in the nav cycles between dark and light directly.

## Code block themes

Syntax highlighting in blog posts automatically switches between two themes when the reader toggles dark/light mode:

- **Dark mode** → `github-dark` theme
- **Light mode** → `github` theme

This happens through a CDN-loaded highlight.js stylesheet. The `CodeTheme` component in `components/code-theme.tsx` watches the current theme and swaps the `<link>` tag's `href` attribute. You don't need to configure anything — it works out of the box.

> [!tip] No re-render needed
> The theme switch is instant because it swaps a CSS stylesheet URL, not React state. Code blocks re-highlight with the new colors without any page flicker.

## Footer customization

The footer appears on all public pages (homepage, blog listing, post pages, category and tag pages) but not on admin pages.

It has a responsive four-column layout:
- **4 columns** on desktop (lg and above)
- **2 columns** on tablet (md)
- **Stacked** on mobile

### Changing social links

The social link URLs in the footer are currently placeholders. To point them to your real profiles, edit `components/footer.tsx` and find the social link entries:

```typescript
// Current placeholder values — replace with your actual URLs
{ href: "https://github.com", icon: Github, label: "GitHub" }
{ href: "https://linkedin.com", icon: Linkedin, label: "LinkedIn" }
{ href: "https://x.com", icon: Twitter, label: "X (Twitter)" }
```

Change each `href` to your actual profile URL:

```typescript
{ href: "https://github.com/your-username", icon: Github, label: "GitHub" }
{ href: "https://linkedin.com/in/your-profile", icon: Linkedin, label: "LinkedIn" }
{ href: "https://x.com/your-handle", icon: Twitter, label: "X (Twitter)" }
```

The footer also includes an RSS feed link that automatically points to your blog's `/feed.xml` route.

### Changing the footer description

In the same `components/footer.tsx` file, the "About" column contains a short description blurb. Update the text to describe your blog's focus.

## Site metadata

The blog name, description, and SEO metadata live in `app/layout.tsx`. Find the `metadata` export and update these values:

```typescript
export const metadata: Metadata = {
  title: {
    default: "Your Blog Name",
    template: "%s | Your Blog Name",
  },
  description: "A brief description of your blog for search engines",
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

Also update the `websiteJsonLd` structured data object in the same file so Google's search results reflect your blog name:

```typescript
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Your Blog Name",
  // update other fields to match
};
```

### Setting your production URL

The `NEXT_PUBLIC_APP_URL` environment variable controls canonical URLs, the sitemap, RSS feed links, and OG image generation.

- **Local development:** Keep `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`.
- **Vercel without custom domain:** Leave it unset. The app reads `VERCEL_URL` automatically.
- **Vercel with custom domain:** Set `NEXT_PUBLIC_APP_URL=https://yourdomain.com` in your Vercel environment variables.

> [!tip] robots.txt sitemap URL
> The sitemap URL in `app/robots.ts` is derived from `NEXT_PUBLIC_APP_URL` (or `VERCEL_URL` fallback). Set `NEXT_PUBLIC_APP_URL` to your custom domain and the sitemap URL updates automatically.

## OG images (social sharing previews)

When someone shares a post on X (Twitter), LinkedIn, Discord, or Slack, they see a generated Open Graph image. The blog handles this automatically:

- A 1200×630 PNG image is generated dynamically at `/api/og`
- It includes the post title, excerpt, and category on a purple gradient background
- Each post's `<meta>` tags point to its unique OG image URL with title and excerpt parameters

You don't need to create OG images manually. To customize the design (colors, layout, fonts), edit `app/api/og/route.tsx` — it uses `@vercel/og` with JSX-like syntax running on the Edge Runtime.

## Author profile

Your author information appears on every post you write — in the author card below the content and in the BlogPosting JSON-LD structured data (metadata that helps search engines display rich results).

To update your profile:

1. Log in at `/admin/login`.
2. Go to **Settings** in the admin sidebar.
3. Update your **name**, **bio**, and **avatar URL**.
4. Click **Save**.

> [!tip] Avatar URL
> Like cover images, the avatar uses an HTTPS URL. Upload your photo to any image host and paste the direct link.

## Fonts

The blog uses two Google Fonts loaded via `next/font` for optimal performance:

- **Inter** — body text (CSS variable: `--font-inter`)
- **JetBrains Mono** — code blocks and monospace elements (CSS variable: `--font-jetbrains-mono`)

To change fonts, update the imports and variable assignments in `app/layout.tsx`.

## Adding new pages

The blog uses Next.js App Router. To add a new page:

1. Create a folder under `app/` matching the URL path you want (e.g., `app/about/`).
2. Add a `page.tsx` file inside that folder.
3. Export a default React component — this becomes the page content.

```typescript
// app/about/page.tsx
export default function AboutPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold">About</h1>
      <p className="mt-4 text-muted-foreground">Your about page content here.</p>
    </main>
  );
}
```

> [!note] Navigation isn't automatic
> Adding a page file creates the route, but it won't appear in the navigation bar or footer automatically. To add a nav link, edit `components/navigation.tsx`. To add a footer link, edit `components/footer.tsx`.

## Robots and sitemap

The blog automatically generates:

- **`/robots.txt`** — allows all crawlers, blocks `/admin/` and `/api/auth/` paths
- **`/sitemap.xml`** — includes the homepage, blog listing, all published posts, and all categories with last-modified dates
- **`/feed.xml`** — RSS 2.0 feed of the 20 most recent published posts

These regenerate on each request based on your current content. No manual maintenance needed.

## Global styles

All global CSS lives in `app/globals.css`. The styling is built on Tailwind CSS with the `tailwindcss-animate` plugin. To change colors, spacing, or other design tokens, edit `tailwind.config.ts`.

The highlight.js code block styles (padding, border radius, overflow) are defined in `globals.css` under the `.hljs` selector. Background colors come from the CDN theme stylesheet, not from your local CSS.

## What's next?

- **[[getting-started]]** — need to revisit the setup steps? The quick start is here
- **[[writing-posts]]** — ready to create your first post? The full writing guide walks you through it
- For deeper architecture understanding, see the technical documentation in `docs/technical/`
