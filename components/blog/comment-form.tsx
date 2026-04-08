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
        setErrorMessage("For mange kommentarer. Vent venligst et øjeblik og prøv igen.");
      } else {
        const json = await res.json().catch(() => ({}));
        setState("error");
        setErrorMessage(json.error || "Der opstod en fejl. Prøv igen.");
      }
    } catch {
      setState("error");
      setErrorMessage("Netværksfejl. Tjek din forbindelse og prøv igen.");
    }
  }

  if (state === "success") {
    return (
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-6 text-center">
        <p className="font-medium text-green-700 dark:text-green-400">
          Tak for din kommentar!
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Den afventer godkendelse og vises, når en admin har gennemset den.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setState("idle")}
        >
          Skriv en ny kommentar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <h3 className="text-lg font-semibold">Skriv en kommentar</h3>

      {/* Honeypot — visually hidden, must not be filled by real users */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="website">Lad dette felt stå tomt</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="comment-name">
            Navn <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="comment-name"
            name="authorName"
            type="text"
            required
            maxLength={100}
            placeholder="Dit navn"
            disabled={state === "submitting"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="comment-email">
            Email <span className="text-muted-foreground text-xs">(valgfrit, vises ikke)</span>
          </Label>
          <Input
            id="comment-email"
            name="authorEmail"
            type="email"
            maxLength={254}
            placeholder="din@email.dk"
            disabled={state === "submitting"}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment-content">
          Kommentar <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="comment-content"
          name="content"
          required
          maxLength={2000}
          rows={4}
          placeholder="Skriv din kommentar her…"
          disabled={state === "submitting"}
        />
      </div>

      {state === "error" && errorMessage && (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sender…" : "Send kommentar"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Kommentarer gennemses inden de vises.
      </p>
    </form>
  );
}
