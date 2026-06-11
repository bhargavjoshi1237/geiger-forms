"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function PublishDialog({ open, onOpenChange, slug, status, onChange }) {
  const isPublished = status === "Published";
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/form/${slug}`;

  const toggle = async (next) => {
    setBusy(true);
    try {
      await onChange(next ? "Published" : "Draft");
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    if (typeof navigator === "undefined") return;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isPublished ? "Form is live" : "Publish form"}</DialogTitle>
          <DialogDescription>
            {isPublished
              ? "Anyone with the link can submit a response. Toggle off to stop collecting."
              : "Publish to start collecting responses from anyone with the link."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-card p-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isPublished && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-75" />
                )}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isPublished ? "bg-[#4ade80]" : "bg-[#525252]"}`} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{isPublished ? "Live" : "Draft"}</p>
                <p className="text-xs text-text-secondary">
                  {isPublished ? "Accepting responses" : "Not accepting responses"}
                </p>
              </div>
            </div>
            <Switch checked={isPublished} disabled={busy} onCheckedChange={toggle} />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Public link</p>
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2">
              <Globe className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <span className={`min-w-0 flex-1 truncate text-xs ${isPublished ? "text-muted-foreground" : "text-text-tertiary"}`} title={url}>
                {url}
              </span>
              <button
                type="button"
                onClick={copy}
                title={copied ? "Copied!" : "Copy link"}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors hover:bg-surface-active ${copied ? "text-[#4ade80]" : "text-text-secondary hover:text-foreground"}`}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open form"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-active hover:text-foreground ${isPublished ? "" : "pointer-events-none opacity-40"}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            {!isPublished && <p className="mt-1.5 text-[10px] text-text-tertiary">The link starts working once the form is live.</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
