"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function Navigation() {
  const { theme, setTheme } = useTheme();

  return (
    <nav className="border-b sticky top-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold font-mono">
          AI<span className="text-primary">Coding</span>Blog
        </Link>
        
        <div className="flex items-center gap-6">
          <Link href="/blog" className="hover:text-primary transition-colors">
            Blog
          </Link>
          <Link href="/blog/categories" className="hover:text-primary transition-colors">
            Categories
          </Link>
          <Link href="/admin" className="hover:text-primary transition-colors">
            Admin
          </Link>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
