import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath?: string;
  /** Extra search params to preserve (e.g. category) when building page links. */
  searchParams?: Record<string, string>;
}

/**
 * Build a page href that preserves existing search params (like category)
 * while setting the page number. Page 1 omits the page param for clean URLs.
 */
function buildPageHref(
  page: number,
  basePath: string,
  searchParams?: Record<string, string>
): string {
  const params = new URLSearchParams(searchParams);
  if (page > 1) {
    params.set("page", String(page));
  } else {
    params.delete("page");
  }
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Generate the array of page numbers to display, with ellipsis gaps.
 * Returns numbers for pages and null for ellipsis positions.
 *
 * Strategy: always show first, last, and a window around current page.
 */
function getPageNumbers(
  currentPage: number,
  totalPages: number
): (number | null)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [];

  // Always include page 1
  pages.push(1);

  if (currentPage > 3) {
    pages.push(null); // left ellipsis
  }

  // Window around current page
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (currentPage < totalPages - 2) {
    pages.push(null); // right ellipsis
  }

  // Always include last page
  pages.push(totalPages);

  return pages;
}

export function BlogPagination({
  currentPage,
  totalPages,
  basePath = "/blog",
  searchParams,
}: BlogPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  return (
    <Pagination className="mt-12">
      <PaginationContent>
        {/* Previous */}
        <PaginationItem>
          {isFirstPage ? (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 pl-2.5 pointer-events-none opacity-50"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </span>
          ) : (
            <Link
              href={buildPageHref(currentPage - 1, basePath, searchParams)}
              aria-label="Go to previous page"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 pl-2.5"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </Link>
          )}
        </PaginationItem>

        {/* Page numbers */}
        {pages.map((page, idx) =>
          page === null ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <Link
                href={buildPageHref(page, basePath, searchParams)}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: page === currentPage ? "outline" : "ghost",
                    size: "icon",
                  })
                )}
              >
                {page}
              </Link>
            </PaginationItem>
          )
        )}

        {/* Next */}
        <PaginationItem>
          {isLastPage ? (
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 pr-2.5 pointer-events-none opacity-50"
              )}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </span>
          ) : (
            <Link
              href={buildPageHref(currentPage + 1, basePath, searchParams)}
              aria-label="Go to next page"
              className={cn(
                buttonVariants({ variant: "ghost", size: "default" }),
                "gap-1 pr-2.5"
              )}
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
