# Writing and Managing Blog Posts

After this guide, you'll know how to create, edit, publish, and organize posts using the admin dashboard — including how to handle images on Vercel where file uploads aren't available.

## Accessing the admin dashboard

Navigate to `/admin/login` on your blog and sign in. The seeded account is:

- **Email:** `admin@aicodingblog.com`
- **Password:** `admin123`

Once logged in, the admin dashboard shows your posts, categories, tags, and site settings.

## Creating a new post

1. Click **Posts** in the admin sidebar, then **New Post**.
2. Fill in the fields:
   - **Title** — appears as the page heading and in search results
   - **Slug** — auto-generated from the title; this becomes the URL path (`/blog/your-slug`)
   - **Excerpt** — a short summary shown on the homepage, in RSS feeds, and in social previews
   - **Content** — write in Markdown. The editor supports GitHub Flavored Markdown (GFM) including tables, task lists, and syntax-highlighted code blocks
   - **Cover image** — see [Adding images](#adding-images-on-vercel) below
3. Assign at least one **category** and relevant **tags** for discoverability.
4. Toggle **Published** when you're ready for the post to appear on the public blog.
5. Toggle **Featured** to pin the post to the homepage hero section.
6. Click **Save**.

Your new post appears on the blog within 60 seconds (the ISR revalidation window — a background mechanism that refreshes cached pages without a full redeploy). Visiting the post URL directly renders it immediately.

## Editing an existing post

1. Go to **Posts** in the admin sidebar.
2. Click the post you want to edit.
3. Make your changes and click **Save**.

Edits propagate through ISR (Incremental Static Regeneration — Vercel re-renders the page in the background on the next visitor request) within 60 seconds. No redeploy is needed.

## Managing categories

Categories group related posts (e.g., "Artificial Intelligence", "Web Development", "Tutorials").

1. Go to **Categories** in the admin sidebar.
2. Click **New Category** or edit an existing one.
3. Each category has a **name**, **slug**, and optional **description**.
4. Categories appear in the blog navigation and get their own landing pages at `/blog/category/{slug}`.

## Managing tags

Tags are more granular than categories (e.g., "TypeScript", "Next.js", "Prisma").

1. Go to **Tags** in the admin sidebar.
2. Create or edit tags. Each tag has a **name** and **slug**.
3. Assign tags to posts when creating or editing them.

## Adding images on Vercel

On Vercel's Hobby tier, file uploads to the server's filesystem are disabled — the filesystem is read-only after deployment. Instead, use external image URLs:

1. Upload your image to any HTTPS-accessible host (e.g., [Imgur](https://imgur.com), [Cloudinary](https://cloudinary.com), or your own S3 bucket).
2. Copy the direct `https://...` URL to the image.
3. Paste that URL into the **Cover Image** field in the post editor.

The blog uses `next/image` with a wildcard `remotePatterns` configuration, so any HTTPS image URL works out of the box.

> **Running locally?** The `/api/upload` endpoint works on `localhost` and saves to `public/uploads/`. This is only available in non-Vercel environments.

## Writing in Markdown

The post content field supports full Markdown with these extensions:

- **Code blocks** with syntax highlighting (use triple backticks with a language identifier)
- **Tables** using GitHub Flavored Markdown pipe syntax
- **Task lists** with `- [ ]` and `- [x]`
- **Raw HTML** when Markdown isn't enough
- **Heading anchors** auto-generated for linking to sections

Example:

````markdown
## My Section Title

Here's a code example:

```typescript
export async function GET() {
  return Response.json({ message: "Hello from the blog!" });
}
```

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| Code highlighting | ✅ |
| Images | External URLs |
````

## Understanding publishing and visibility

| State | Visible on blog? | Accessible via direct URL? |
|-------|-------------------|---------------------------|
| **Draft** (unpublished) | No | No |
| **Published** | Yes, within 60 seconds | Immediately |
| **Featured + Published** | Homepage hero section + blog listing | Immediately |

## What's next?

- [Customize your blog](./customization.md) — change the site name, author profile, and theme
- [Troubleshoot common issues](./troubleshooting.md) — images not loading? Posts not appearing? Start here
