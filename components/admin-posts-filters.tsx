"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface AdminPostsFiltersProps {
  categories: Category[];
}

export function AdminPostsFilters({ categories }: AdminPostsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        startTransition(() => {
          router.push(`${pathname}?${createQueryString({ search: value })}`);
        });
      }, 300);
    },
    [pathname, router, createQueryString]
  );

  const handleCategory = useCallback(
    (value: string) => {
      startTransition(() => {
        router.push(
          `${pathname}?${createQueryString({ category: value === "all" ? "" : value })}`
        );
      });
    },
    [pathname, router, createQueryString]
  );

  return (
    <div className="flex gap-3 items-center">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search posts…"
          defaultValue={searchParams.get("search") ?? ""}
          onChange={handleSearch}
          className="pl-9"
          aria-label="Search posts"
        />
      </div>

      <Select
        defaultValue={searchParams.get("category") ?? "all"}
        onValueChange={handleCategory}
      >
        <SelectTrigger className="w-48" aria-label="Filter by category">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.slug}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
