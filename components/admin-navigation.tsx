"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, LogOut } from "lucide-react";
import { useState } from "react";

export function AdminNavigation() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      } else {
        alert("Logout failed. Please try again.");
        setLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout failed. Please try again.");
      setLoggingOut(false);
    }
  };

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
          <Link href="/admin" className="hover:text-primary transition-colors font-medium">
            Admin
          </Link>
          <Link href="/admin/users" className="hover:text-primary transition-colors">
            Users
          </Link>
          <Link href="/admin/settings" className="hover:text-primary transition-colors">
            Settings
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {loggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>
    </nav>
  );
}
