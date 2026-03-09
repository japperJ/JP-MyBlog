---
title: "Markdown Rendering Pipeline"
description: "How raw Markdown becomes rendered HTML with syntax highlighting, sanitization, heading IDs, and theme switching"
category: technical
created: 2025-07-26
updated: 2025-07-26
---

# Markdown Rendering Pipeline

This document traces the complete path from a raw Markdown string stored in the database to a fully rendered blog post with syntax-highlighted code blocks, clickable TOC headings, and theme-aware styling.

## Invariants

> [!important] Heading ID parity (design contract)
> `extractHeadings()` in `lib/markdown.ts` and `rehype-slug` in the ReactMarkdown pipeline **both use `github-slugger` internally** to generate heading IDs. The IDs produced by `extractHeadings()` (used for TOC links) must match the IDs `rehype-slug` adds to `<h1>`–`<h6>` elements in the rendered HTML. Breaking this breaks the Table of Contents — TOC links won't scroll to their target headings.
>
> Source: `lib/markdown.ts` (comment in source confirms this contract), `components/blog/post-content.tsx`.

> [!important] rehype-slug must run after rehype-sanitize
> Plugin order matters. If `rehype-slug` ran before `rehype-sanitize`, the sanitizer could strip the generated `id` attributes. The current order — `rehype-raw` → `rehype-sanitize` → `rehype-slug` — ensures IDs survive sanitization.

> [!important] rehype-highlight is NOT used
> `rehype-highlight` is in `package.json` but is **not imported** anywhere. Syntax highlighting relies entirely on CDN-loaded highlight.js stylesheets auto-applying to `language-*` CSS classes. This is a conscious design choice — see [[design-decisions#code-highlighting]].

## Pipeline Overview

```
Post.content (raw Markdown string from database)
   │
   ▼
ReactMarkdown (react-markdown ^9.0.1)
   │
   ├─ Remark plugins:
   │    └─ remark-gfm (^4.0.0)
   │         Tables, strikethrough, task lists, autolinks
   │
   ├─ Rehype plugins (in order — order matters):
   │    ├─ 1. rehype-raw (^7.0.0)
   │    │      Allows raw HTML embedded in Markdown
   │    │
   │    ├─ 2. rehype-sanitize (^6.0.0)
   │    │      Sanitizes HTML output (XSS prevention)
   │    │      Extended schema: allows target/rel on <a>
   │    │
   │    └─ 3. rehype-slug (^6.0.0)
   │           Adds id attributes to h1–h6 elements
   │           Uses github-slugger internally
   │
   └─ Custom component overrides:
        ├─ code → CodeBlock (fenced blocks) or inline <code>
        └─ a → External links get target="_blank" rel="noopener noreferrer"
```

**Source files:**
- Pipeline configuration: `components/blog/post-content.tsx`
- Heading extraction: `lib/markdown.ts`
- Code block rendering: `components/blog/code-block.tsx`
- Theme switching: `components/code-theme.tsx`
- CDN stylesheet: `app/layout.tsx` (`<link data-highlight-theme>`)
- CSS integration: `app/globals.css` (`.hljs` class)

## Plugin Chain Detail

### remark-gfm

**What it does:** Extends the Markdown parser to support GitHub Flavored Markdown extensions.

**Features enabled:**
- Tables (`| col1 | col2 |`)
- Strikethrough (`~~deleted~~`)
- Task lists (`- [x] done`)
- Autolinks (`https://example.com` becomes a clickable link)

**Why remark-gfm and not the base parser:** Standard CommonMark doesn't support tables or task lists. Since blog content is authored in a Markdown editor that supports GFM, the renderer must match.

### rehype-raw

**What it does:** Parses raw HTML blocks embedded in Markdown and converts them to the hast (HTML AST) tree. Without it, raw HTML passes through as text strings, not rendered elements.

**Why it's needed:** Authors may embed `<details>`, `<summary>`, `<video>`, or other HTML that Markdown syntax can't express. This plugin makes that HTML renderable.

**Trade-off:** Enables HTML injection — which is why `rehype-sanitize` runs immediately after.

### rehype-sanitize

**What it does:** Strips dangerous HTML attributes and elements to prevent XSS attacks.

**Default schema:** Based on GitHub's sanitization rules.

**Custom extensions (defined in `post-content.tsx`):**

| Element | Allowed attributes | Values |
|---|---|---|
| `<a>` | `target` | Any (used for `_blank`) |
| `<a>` | `rel` | `noopener`, `noreferrer`, `nofollow` |

**Why extend the schema:** External links need `target="_blank"` to open in new tabs. The default sanitization schema strips `target` and `rel` attributes. The extension allows only these specific, safe attributes.

**Trade-off:** Sanitization limits what HTML authors can embed. Elements like `<script>`, `<iframe>`, `<style>`, and event handlers (`onclick`, etc.) are stripped. This is the correct trade-off for user-authored content rendered on a public page.

### rehype-slug

**What it does:** Adds `id` attributes to heading elements (`<h1>` through `<h6>`) based on their text content, using `github-slugger` for slug generation.

**Example:** `## Getting Started` → `<h2 id="getting-started">Getting Started</h2>`

**Why it must run after rehype-sanitize:** If it ran before sanitize, the sanitizer could strip the `id` attributes it added. Running after ensures IDs are preserved in the final output.

**Relationship to TOC:** The `TableOfContents` component uses IDs from `extractHeadings()` to build scroll-to links. These IDs **must match** what `rehype-slug` generates. See the heading ID invariant above.

## Heading Extraction for Table of Contents

`extractHeadings()` in `lib/markdown.ts`:

1. Parses raw Markdown with regex: `/^(#{1,6})\s+(.+)$/gm`
2. For each match, creates `{ level, text, id }` where `id` is generated by `github-slugger`.
3. Returns an array of headings.

**Called in:** `app/blog/[slug]/page.tsx` (server component). The result is passed to `PostPageClient` → `TableOfContents`.

**Why regex instead of parsing the rendered HTML:** Heading extraction happens on the server before the client component renders. Parsing the raw Markdown with regex is simpler and faster than rendering to HTML and then parsing the HTML back. The `github-slugger` dependency ensures ID parity with `rehype-slug`.

> [!warning] Fragility
> The regex approach cannot handle headings inside code blocks (they'd be falsely matched) or headings with inline HTML. In practice, blog content doesn't use these patterns, so this is an acceptable trade-off. If content patterns change, consider parsing the Markdown AST instead.

## Code Block Rendering

### CodeBlock Component

**Source:** `components/blog/code-block.tsx`

The `code` component override in ReactMarkdown routes fenced code blocks (those with a `className` like `language-javascript`) to the `CodeBlock` component.

**Rendered output:**

```html
<div class="relative group">
  <!-- Header bar -->
  <div class="flex items-center justify-between ...">
    <span>{language label}</span>
    <button>Copy</button>            <!-- copies code to clipboard -->
  </div>
  <!-- Code block -->
  <pre>
    <code class="language-javascript hljs">
      {code content}
    </code>
  </pre>
</div>
```

**Inline code** (no language class) renders as a plain `<code>` element with Tailwind styling.

### Syntax Highlighting (CDN highlight.js)

**Mechanism:** highlight.js 11.9.0 is loaded from a CDN. The library auto-initializes on page load and applies syntax highlighting to any `<code>` element with a `language-*` CSS class.

**Why CDN and not bundled:**
- Avoids adding highlight.js (~300KB with all languages) to the client bundle.
- Theme switching via `<link>` href swap is instant — no React re-render needed.
- The `language-*` class convention is a standard that highlight.js auto-detects.

See [[design-decisions#code-highlighting]] for the full ADR.

### Theme Switching

**Source:** `components/code-theme.tsx`

The `CodeTheme` component:

1. Uses `useTheme()` from `next-themes` to read `resolvedTheme` (accounts for system preference).
2. Finds the `<link>` element with `data-highlight-theme=""` attribute in the DOM (injected in `app/layout.tsx`).
3. Swaps the `href` between:
   - **Dark mode:** `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css`
   - **Light mode:** `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css`

**Initial state:** `app/layout.tsx` includes a `<link>` with `data-highlight-theme=""` and the dark theme URL as default (matches `defaultTheme="dark"` in `ThemeProvider`).

**Performance:** The theme swap is a single DOM attribute change. The browser fetches the new stylesheet (typically cached by the CDN) and re-paints. No React re-render, no JavaScript re-execution of highlighting.

### CSS Integration

`app/globals.css` provides layout-only styles for the `.hljs` class:

```css
.hljs {
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
}
```

**Background color** comes from the CDN theme stylesheet, not from `globals.css`. This ensures the background always matches the selected highlight.js theme.

## External Link Handling

The `a` component override in `post-content.tsx` checks whether a link URL starts with `/` or the app's own origin. External links get:

```html
<a href="..." target="_blank" rel="noopener noreferrer">...</a>
```

Internal links render as plain `<a>` elements (or Next.js `<Link>` if applicable).

## Performance Characteristics

| Operation | Cost | Notes |
|---|---|---|
| `extractHeadings()` | O(n) regex scan | n = content length. Fast for typical blog posts (<50KB). |
| ReactMarkdown render | O(n) AST transform | Remark + rehype pipeline processes the full content. Single-pass. |
| highlight.js init | ~50ms on page load | Auto-initializes on DOM ready. Highlights all `language-*` blocks. |
| Theme switch | ~5ms | DOM attribute change + stylesheet fetch (cached). No re-render. |

**Assumption:** Post content is <50KB. For posts with hundreds of code blocks, highlight.js initialization time scales linearly.

## Known Failure Modes

| Symptom | Root Cause | Detection | Recovery |
|---|---|---|---|
| TOC links don't scroll to headings | Heading ID mismatch between `extractHeadings()` and `rehype-slug` | Click TOC link — page doesn't scroll | Verify both use `github-slugger`. Check for content patterns that break the regex. |
| Code blocks not highlighted | CDN unreachable or blocked | Code appears as plain text with no syntax colors | Check CDN URL in `layout.tsx`. Verify no content blocker is active. |
| Code theme doesn't switch | `data-highlight-theme` attribute missing from `<link>` | Theme toggle changes site colors but not code blocks | Verify `<link data-highlight-theme>` exists in `layout.tsx`. |
| Raw HTML stripped from posts | `rehype-sanitize` blocking the element | Embedded HTML elements don't render | Check if the element is in the sanitization allow list. Extend schema if safe. |
| XSS vulnerability | Sanitization schema too permissive | Security audit finds executable content | Review custom schema extensions in `post-content.tsx`. |

## Trade-offs Summary

| Trade-off | What we gain | What we give up |
|---|---|---|
| CDN highlight.js over bundled | Small client bundle, instant theme switch | External dependency (CDN availability), no server-side highlighting |
| `rehype-sanitize` over no sanitization | XSS prevention | Limits embeddable HTML (no iframes, scripts, styles) |
| Regex heading extraction over AST parsing | Simplicity, server-side execution | Can't handle headings in code blocks or with inline HTML |
| `rehype-raw` + sanitize over no raw HTML | Authors can use arbitrary HTML | Adds complexity to the pipeline (two extra plugins) |

## Related Documentation

- [[architecture#component-hierarchy]] — Where `PostContent` sits in the page layout
- [[design-decisions#code-highlighting]] — Why CDN highlight.js over rehype-highlight/Shiki/Prism
- [[design-decisions#markdown-renderer]] — Why react-markdown over MDX/Contentlayer
