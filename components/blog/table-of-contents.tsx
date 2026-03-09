"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface TableOfContentsProps {
  headings: Heading[];
}

/**
 * Scroll-spy Table of Contents.
 *
 * Desktop (≥lg): Vertical nav rendered inside a sticky sidebar by the parent.
 * Mobile (<lg): Collapsible "On this page" section, collapsed by default.
 *
 * Uses IntersectionObserver to highlight the currently-visible heading.
 */
export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Filter to h2 and h3 only — h1 is the page title rendered outside markdown
  const tocHeadings = headings.filter((h) => h.level >= 2 && h.level <= 3);

  useEffect(() => {
    if (tocHeadings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      // -80px top for sticky nav offset; -80% bottom so heading activates
      // when it enters the top ~20% of the viewport
      { rootMargin: "-80px 0px -80% 0px" }
    );

    for (const { id } of tocHeadings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [tocHeadings]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        setActiveId(id);
      }
      // Collapse mobile TOC after click
      setMobileOpen(false);
    },
    []
  );

  if (tocHeadings.length === 0) return null;

  const headingList = (
    <ul className="space-y-2 text-sm">
      {tocHeadings.map((heading) => (
        <li key={heading.id} className={heading.level === 3 ? "pl-4" : ""}>
          <a
            href={`#${heading.id}`}
            onClick={(e) => handleClick(e, heading.id)}
            className={`block py-0.5 transition-colors hover:text-foreground ${
              activeId === heading.id
                ? "text-primary font-medium"
                : "text-muted-foreground"
            }`}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {/* Desktop TOC — hidden below lg, shown inside parent sticky aside */}
      <nav className="hidden lg:block" aria-label="Table of contents">
        <p className="text-sm font-semibold mb-3">On this page</p>
        {headingList}
      </nav>

      {/* Mobile TOC — visible below lg, collapsible */}
      <div className="lg:hidden border rounded-lg mb-6">
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
          aria-expanded={mobileOpen}
        >
          On this page
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              mobileOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {mobileOpen && <div className="px-4 pb-3">{headingList}</div>}
      </div>
    </>
  );
}
