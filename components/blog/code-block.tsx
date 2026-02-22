"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-md border border-b-0">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-6 px-2"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 mr-1" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="!mt-0 rounded-t-none overflow-x-auto">
        <code className={`language-${language}`}>{value}</code>
      </pre>
    </div>
  );
}
