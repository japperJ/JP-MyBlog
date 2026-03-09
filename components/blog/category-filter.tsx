import Link from "next/link";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface CategoryFilterProps {
  categories: Category[];
  activeCategory?: string;
}

export function CategoryFilter({
  categories,
  activeCategory,
}: CategoryFilterProps) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {/* "All" pill — active when no category is selected */}
      <Link
        href="/blog"
        className={cn(
          "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
          !activeCategory
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground hover:bg-muted/80"
        )}
      >
        All
      </Link>

      {categories.map((category) => {
        const isActive = activeCategory === category.slug;
        return (
          <Link
            key={category.id}
            href={`/blog?category=${category.slug}`}
            className={cn(
              "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
