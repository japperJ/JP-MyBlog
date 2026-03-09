import Link from "next/link";
import { Github, Linkedin, Twitter, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog", label: "Blog" },
  { href: "/blog/categories", label: "Categories" },
  { href: "/feed.xml", label: "RSS Feed" },
] as const;

const SOCIAL_LINKS = [
  { href: "https://github.com", label: "GitHub", icon: Github },
  { href: "https://linkedin.com", label: "LinkedIn", icon: Linkedin },
  { href: "https://x.com", label: "X (Twitter)", icon: Twitter },
  { href: "/feed.xml", label: "RSS Feed", icon: Rss },
] as const;

const RESOURCE_LINKS = [
  { href: "/feed.xml", label: "RSS Feed" },
  { href: "/sitemap.xml", label: "Sitemap" },
] as const;

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-mono font-bold text-lg mb-3">
              AI<span className="text-primary">Coding</span>Blog
            </h3>
            <p className="text-sm text-muted-foreground">
              Exploring the intersection of AI and software development.
              Tutorials, insights, and deep dives into modern tools and
              techniques for developers.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Navigation</h3>
            <ul className="space-y-2">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Connect</h3>
            <div className="flex gap-2">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                <Button key={label} variant="ghost" size="icon" asChild>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Resources</h3>
            <ul className="space-y-2">
              {RESOURCE_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li className="text-sm text-muted-foreground">
                Built with Next.js
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AI Coding Blog. Built with Next.js.
        </div>
      </div>
    </footer>
  );
}
