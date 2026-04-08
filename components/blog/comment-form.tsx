"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CommentFormProps {
  postId: string;
}

type FormState = "idle" | "submitting" | "success" | "error";

export function CommentForm({ postId }: CommentFormProps) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);

    const payload = {
      postId,
      authorName: (data.get("authorName") as string).trim(),
      authorEmail: (data.get("authorEmail") as string).trim(),
      content: (data.get("content") as string).trim(),
      website: data.get("website") as string, // honeypot
    };

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setState("success");
        form.reset();
      } else if (res.status === 429) {
        setState("error");
        setErrorMessage("Too many comments. Please wait a moment and try again.");
      } else {
        const json = await res.json().catch(() => ({}));
        setState("error");
        setErrorMessage(json.error || "Something went wrong. Please try again.");
      }
    } catch {
      setState("error");
      setErrorMessage("Network error. Check your connection and try again.");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-6 text-center">
        <p className="font-medium text-green-700 dark:text-green-400">
          Thanks for your comment!
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          It&apos;s pending review and will appear once an admin has approved it.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setState("idle")}
        >
          Write another comment
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <h3 className="text-lg font-semibold">Leave a comment</h3>

      {/* Honeypot — visually hidden, must not be filled by real users */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="comment-name">
            Name <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="comment-name"
            name="authorName"
            type="text"
            required
            maxLength={100}
            placeholder="Your name"
            disabled={state === "submitting"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comment-email">
            Email <span className="text-muted-foreground text-xs">(optional, not shown publicly)</span>
          </Label>
          <Input
            id="comment-email"
            name="authorEmail"
            type="email"
            maxLength={254}
            placeholder="you@example.com"
            disabled={state === "submitting"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment-content">
          Comment <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="comment-content"
          name="content"
          required
          maxLength={2000}
          rows={4}
          placeholder="Write your comment here…"
          disabled={state === "submitting"}
        />
      </div>

      {state === "error" && errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Submitting…" : "Post comment"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Comments are reviewed before they appear.
      </p>
    </form>
  );
}
