"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { searchPosts, type SearchResult } from "@/app/actions/search";

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Custom event listener for navigation trigger button
  useEffect(() => {
    function onOpenSearch() {
      setOpen(true);
    }

    window.addEventListener("open-search", onOpenSearch);
    return () => window.removeEventListener("open-search", onOpenSearch);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const posts = await searchPosts(query);
        setResults(posts);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, []);

  // Navigate to post on selection
  const handleSelect = useCallback(
    (slug: string) => {
      router.push(`/blog/${slug}`);
      setOpen(false);
      setQuery("");
      setResults([]);
    },
    [router]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
    >
      <CommandInput
        placeholder="Search posts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && query.trim().length < 2 && (
          <CommandEmpty>Start typing to search posts...</CommandEmpty>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <CommandEmpty>
            No posts found. Try a different search term.
          </CommandEmpty>
        )}

        {results.length > 0 && (
          <CommandGroup heading="Posts">
            {results.map((post) => (
              <CommandItem
                key={post.id}
                value={post.slug}
                onSelect={() => handleSelect(post.slug)}
                className="flex flex-col items-start gap-1 py-3"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{post.title}</span>
                </div>
                {post.excerpt && (
                  <p className="pl-6 text-xs text-muted-foreground line-clamp-1">
                    {post.excerpt}
                  </p>
                )}
                {post.categories.length > 0 && (
                  <div className="pl-6 flex gap-1">
                    {post.categories.map(({ category }) => (
                      <span
                        key={category.slug}
                        className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                      >
                        {category.name}
                      </span>
                    ))}
                  </div>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
