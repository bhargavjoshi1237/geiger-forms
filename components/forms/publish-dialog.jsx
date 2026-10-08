"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, ExternalLink, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import { Button } from "@geiger/ui/button";
import { Switch } from "@geiger/ui/switch";
import { cn } from "@/lib/utils";
import { withPrefix } from "@/lib/workspace/base-path";

export function publicFormUrl(slug) {
  return `${typeof window !== "undefined" ? window.location.origin : ""}${withPrefix(`/form/${slug}`)}`;
}

// Publish / unpublish with pre-flight warnings and the shareable link.
export function PublishDialog({ open, onOpenChange, slug, status, onChange, warnings = [], onReviewWarning, canPublish = true }) {
  const isPublished = status === "Published";
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = publicFormUrl(slug);

  const apply = async (next) => {
    setBusy(true);
    try {
      await onChange(next ? "Published" : "Draft");
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Couldn't copy the link."),
    );
  };

  const blocking = !isPublished && warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isPublished ? "Form is live" : "Publish form"}</DialogTitle>
          <DialogDescription>
            {isPublished
              ? "Anyone with the link can submit a response. Turn it off to stop collecting."
              : "Publish to start collecting responses from anyone with the link."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {blocking ? (
            <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5">
              <p className="flex items-center gap-2 text-sm font-medium text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                {warnings.length} thing{warnings.length === 1 ? "" : "s"} to check before publishing
              </p>
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {warnings.map((w) => (
                  <li key={w.id} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
                    <span>{w.message}</span>
                    {w.fieldId && onReviewWarning ? (
                      <Button type="button" variant="link" size="xs" onClick={() => onReviewWarning(w)} className="h-auto shrink-0 px-0 font-normal text-text-secondary underline-offset-2 hover:text-foreground">
                        Fix
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isPublished ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /> : null}
                <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", isPublished ? "bg-emerald-400" : "bg-text-tertiary")} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{isPublished ? "Live" : "Draft"}</p>
                <p className="text-xs text-text-secondary">{isPublished ? "Accepting responses" : "Not accepting responses"}</p>
              </div>
            </div>
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-text-secondary" /> : null}
            <Switch checked={isPublished} disabled={busy || !canPublish} onCheckedChange={apply} aria-label="Published" />
          </div>
          {!canPublish ? <p className="text-[11px] text-text-tertiary">You don&apos;t have permission to publish this form.</p> : null}

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Public link</p>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <span className={cn("min-w-0 flex-1 truncate text-xs", isPublished ? "text-muted-foreground" : "text-text-tertiary")} title={url}>{url}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={copy}
                aria-label={copied ? "Copied" : "Copy link"}
                className={cn("shrink-0 rounded", copied ? "text-emerald-400 hover:text-emerald-400" : "text-text-secondary hover:text-foreground")}
              >
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open live form"
                className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-active hover:text-foreground", !isPublished && "pointer-events-none opacity-40")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {!isPublished ? <p className="mt-1.5 text-[11px] text-text-tertiary">The link starts working once the form is live.</p> : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            {isPublished ? "Done" : "Cancel"}
          </Button>
          {!isPublished ? (
            <Button type="button" onClick={() => apply(true)} disabled={busy || !canPublish}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {blocking ? "Publish anyway" : "Publish"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
