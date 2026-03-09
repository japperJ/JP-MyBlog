---
title: "Writing & Publishing Posts"
description: "Create, format, categorize, and publish blog posts through the admin dashboard"
category: user
created: 2025-01-15
updated: 2025-01-15
---

# Writing & Publishing Posts

After following this guide, you'll be able to create a blog post from scratch, format it with Markdown, assign categories and tags, add a cover image, and publish it — all from the admin dashboard.

## Accessing the admin dashboard

1. Navigate to `/admin/login` on your blog.
2. Sign in with your credentials. If you ran the seed script, the default account is:
   - **Email:** `admin@aicodingblog.com`
   - **Password:** `admin123`

Once logged in, the sidebar shows **Posts**, **Categories**, **Tags**, **Media**, **Users**, and **Settings**.

## Creating a post

1. Click **Posts** in the admin sidebar, then **New Post**.
2. Fill in the fields:
   - **Title** — the heading that appears on the post page and in search results. The URL slug is auto-generated from the title (e.g., "Getting Started with Prisma" → `/blog/getting-started-with-prisma`).
   - **Excerpt** — a short summary shown on post cards on the homepage, in the RSS feed, and in social sharing previews (OG images).
   - **Content** — write in Markdown. See [Markdown formatting](#markdown-formatting) below for what's supported.
   - **Cover image** — see [Adding cover images](#adding-cover-images) below.
3. Assign one or more **categories** and **tags**.
4. Set the **Published** toggle to on when you're ready for readers to see it.
5. Optionally toggle **Featured** to pin the post to the homepage hero section.
6. Click **Save**.

Your post appears on the blog within 60 seconds. The blog uses ISR (Incremental Static Regeneration — a background caching mechanism that refreshes pages without a full redeploy) with a 60-second window, so the homepage and `/blog` listing update automatically.

> [!tip] Reading time is automatic
> You don't need to set reading time manually. The blog calculates it at 200 words per minute from your content and displays it on the post page next to the publish date and view count.

## Editing a post

1. Go to **Posts** in the admin sidebar.
2. Click the post you want to edit.
3. Make your changes and click **Save**.

Edits propagate within 60 seconds via ISR. The admin panel calls `revalidatePath()` on save, which tells Vercel to regenerate the cached page on the next request.

## Markdown formatting

The content editor supports full GitHub Flavored Markdown (GFM) with these features:

### Text formatting

```markdown
**Bold text** and *italic text* and ~~strikethrough~~
```

### Headings

```markdown
## Section Title
### Subsection
#### Deep heading
```

Headings automatically get anchor IDs, so readers can link directly to sections. On the published post, a **Table of Contents** sidebar (on desktop) and a collapsible TOC (on mobile) are generated from your headings.

### Code blocks

Wrap code in triple backticks with a language identifier for syntax highlighting:

````markdown
```typescript
export async function GET() {
  const posts = await prisma.post.findMany({ where: { published: true } });
  return Response.json(posts);
}
```
````

Published code blocks render with:
- A **language label** in the top bar (e.g., "typescript")
- A **copy-to-clipboard button** so readers can grab the code in one click
- **Syntax highlighting** that automatically switches between a light and dark theme when the reader toggles the site's color mode

### Tables

```markdown
| Feature     | Status |
|-------------|--------|
| Markdown    | ✅      |
| Code blocks | ✅      |
| Tables      | ✅      |
```

### Task lists

```markdown
- [x] Write the blog post
- [x] Add cover image
- [ ] Share on social media
```

### Images in content

Embed images using standard Markdown syntax with HTTPS URLs:

```markdown
![A diagram showing the Next.js request lifecycle](https://i.imgur.com/abc123.png)
```

### Raw HTML

You can use HTML when Markdown isn't enough. The blog sanitizes HTML for security, but allows standard elements like `<details>`, `<summary>`, and common formatting tags. External links automatically open in a new tab with `target="_blank"`.

## Adding cover images

Cover images appear as the hero banner at the top of your post page and in OG (Open Graph) social sharing previews.

> [!warning] File uploads are disabled on Vercel
> Vercel's serverless filesystem is read-only after deployment. The `/api/upload` endpoint returns a `501` error on Vercel. You must use external image URLs for cover images on any Vercel-hosted deployment.

To add a cover image:

1. Upload your image to any HTTPS host — [Imgur](https://imgur.com), [Cloudinary](https://cloudinary.com), or a GitHub repository's raw file URL all work.
2. Copy the direct URL (must start with `https://`).
3. Paste it into the **Cover Image** field in the post editor.

The blog's `next/image` configuration accepts any HTTPS source, so no additional domain allowlisting is needed.

> [!tip] Running locally?
> On `localhost`, the `/api/upload` endpoint works and saves files to `public/uploads/`. You can use either uploaded files or HTTPS URLs for local development.

## Categories

Categories are broad groupings for your posts (e.g., "Artificial Intelligence", "Web Development", "Tutorials").

1. Go to **Categories** in the admin sidebar.
2. Click **New Category** or edit an existing one.
3. Each category has a **name**, auto-generated **slug**, and optional **description**.
4. Assign categories to posts when creating or editing them.

Published categories get their own listing page at `/blog/category/{slug}` where readers can browse all posts in that category. Category filter pills also appear at the top of the `/blog` page for quick filtering.

## Tags

Tags provide finer-grained labeling (e.g., "TypeScript", "Prisma", "Next.js").

1. Go to **Tags** in the admin sidebar.
2. Create or edit tags — each has a **name** and auto-generated **slug**.
3. Assign tags to posts when creating or editing them.

On a published post, tags appear as clickable links below the content. Each tag links to `/blog/tag/{slug}` — a dedicated page where readers find all posts with that tag.

## Search discoverability

Published posts are automatically searchable through the **⌘K command palette** (Ctrl+K on Windows/Linux). The search covers the post's title, excerpt, and full content, so readers can find your posts by any term that appears in the text.

> [!note] Only published posts appear in search
> Draft posts are invisible to the search. If you've just published a post and it doesn't appear in search results yet, the server action queries published posts directly from the database — there's no delay.

## Publishing workflow

| State | Visible on blog? | Appears in search? | Shows on homepage? |
|---|---|---|---|
| **Draft** (unpublished) | No | No | No |
| **Published** | Yes (within 60 seconds) | Yes | In "Latest Posts" section |
| **Featured + Published** | Yes | Yes | In hero section at the top |

When you toggle a draft to published, the blog sets the `publishedAt` date automatically. This date is what readers see on the post page and what determines the ordering in the RSS feed.

## Post features readers will see

Once published, your post automatically includes these reader-facing features — you don't need to configure any of them:

- **Table of Contents** — generated from your Markdown headings, shown as a sticky sidebar on desktop and a collapsible section on mobile
- **Share buttons** — X (Twitter), LinkedIn, Reddit, and a copy-link button below the post content
- **Previous/Next navigation** — links to the chronologically adjacent posts at the bottom of the page
- **Related posts** — up to 3 posts from the same categories, displayed below the author card
- **Author card** — your name, avatar, and bio from your admin profile

## What's next?

- **[[customization]]** — change the site theme, footer links, and metadata to make the blog yours
- **[[getting-started]]** — need to revisit setup? The quick start is here
- **[[troubleshooting]]** — post not showing up? Search not finding your content? Check common fixes
