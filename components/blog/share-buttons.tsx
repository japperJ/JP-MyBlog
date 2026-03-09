"use client";

import { useState } from "react";
import { Twitter, Linkedin, Link as LinkIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonsProps {
  url: string;
  title: string;
}

/**
 * Social sharing buttons — X (Twitter), LinkedIn, Reddit, Copy Link.
 * All use URL-based sharing (no SDKs). Opens share dialogs in new windows.
 */
export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  function openShareWindow(shareUrl: string) {
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=400");
  }

  function handleCopy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-8 pt-6 border-t">
      <p className="text-sm font-semibold mb-3">Share this post</p>
      <div className="flex items-center gap-2">
        {/* X (Twitter) */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Share on X"
          onClick={() =>
            openShareWindow(
              `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`
            )
          }
        >
          <Twitter className="h-4 w-4" />
        </Button>

        {/* LinkedIn */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Share on LinkedIn"
          onClick={() =>
            openShareWindow(
              `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
            )
          }
        >
          <Linkedin className="h-4 w-4" />
        </Button>

        {/* Reddit — lucide has no Reddit icon; use inline SVG */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Share on Reddit"
          onClick={() =>
            openShareWindow(
              `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
            )
          }
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4 w-4"
          >
            <path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.922.412-.922.919 0 .506.414.918.922.918.508 0 .922-.412.922-.918zm4.04-.919c-.509 0-.922.412-.922.919 0 .506.414.918.922.918.508 0 .922-.412.922-.918 0-.507-.414-.919-.922-.919zM12 2C6.478 2 2 6.477 2 12c0 5.522 4.478 10 10 10s10-4.478 10-10c0-5.523-4.478-10-10-10zm5.655 11.405c.012.146.018.293.018.44 0 2.248-2.612 4.07-5.834 4.07-3.223 0-5.834-1.822-5.834-4.07 0-.147.006-.294.018-.44A1.376 1.376 0 0 1 5.5 12c0-.384.156-.73.407-.98a1.376 1.376 0 0 1 1.97.027c.96-.632 2.258-1.036 3.717-1.076l.702-3.29.018-.06a.283.283 0 0 1 .338-.198l2.325.547c.17-.342.516-.576.918-.576a1.033 1.033 0 0 1 0 2.065 1.02 1.02 0 0 1-1.005-.843l-2.073-.488-.622 2.911c1.423.052 2.685.453 3.624 1.072a1.376 1.376 0 0 1 1.96-.037c.262.256.422.612.422 1.006 0 .514-.28.96-.696 1.2z" />
          </svg>
        </Button>

        {/* Copy Link */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Copy link"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <LinkIcon className="h-4 w-4" />
          )}
        </Button>
        {copied && (
          <span className="text-sm text-green-500 font-medium">Copied!</span>
        )}
      </div>
    </div>
  );
}
