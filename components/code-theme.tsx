"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const DARK_THEME =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css";
const LIGHT_THEME =
  "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";

/**
 * Manages the highlight.js CDN stylesheet based on the current site theme.
 *
 * Finds or creates a `<link data-highlight-theme>` element in `<head>` and
 * swaps its `href` between github-dark and github-light when the user toggles
 * the theme. Renders nothing — returns null.
 *
 * A static `<link>` for github-dark is kept in layout.tsx `<head>` as the
 * initial fallback (matches `defaultTheme="dark"` in ThemeProvider). This
 * component takes over on hydration.
 */
export function CodeTheme() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    // Default to dark when resolvedTheme is undefined (SSR / pre-hydration)
    const href = resolvedTheme === "light" ? LIGHT_THEME : DARK_THEME;

    let link = document.querySelector(
      "link[data-highlight-theme]"
    ) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.setAttribute("data-highlight-theme", "");
      document.head.appendChild(link);
    }

    link.href = href;
  }, [resolvedTheme]);

  return null;
}
