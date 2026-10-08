"use client";

import { useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Eye, EyeOff, Globe, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { cn } from "@/lib/utils";
import { PublishDialog, publicFormUrl } from "@/components/forms/publish-dialog";
import { PresenceAvatars } from "./presence-avatars";

// Builder actions shown in the editor header: presence, favourite, copy link, preview, live link and publish.
export function BuilderTopbarActions({ slug, status, others, previewing, onTogglePreview, onStatusChange, warnings, onReviewWarning, canPublish }) {
  const [favourite, setFavourite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const isPublished = status === "Published";

  const copyLink = () => {
    navigator.clipboard?.writeText(publicFormUrl(slug)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => toast.error("Couldn't copy the link."),
    );
  };

  return (
    <>
      <PresenceAvatars others={others} />
      <Button type="button" variant="ghost" size="icon-sm" aria-label={favourite ? "Remove from favourites" : "Add to favourites"} aria-pressed={favourite} onClick={() => setFavourite((v) => !v)}>
        <Star className={cn("h-4 w-4", favourite && "fill-current text-amber-400")} />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" onClick={copyLink} aria-label={copied ? "Link copied" : "Copy link"} title="Copy public link" className={copied ? "text-emerald-400" : undefined}>
        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      {isPublished ? (
        <Button type="button" variant="ghost" size="icon-sm" asChild>
          <a href={publicFormUrl(slug)} target="_blank" rel="noopener noreferrer" aria-label="Open live form" title="Open live form">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      ) : null}
      <Button
        type="button"
        variant={previewing ? "outline" : "ghost"}
        size="sm"
        aria-pressed={previewing}
        onClick={onTogglePreview}
        className="h-8 gap-1.5"
      >
        {previewing ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {previewing ? "Edit" : "Preview"}
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={() => setPublishOpen(true)}
        className={cn("ml-1 h-8 gap-1.5", isPublished && "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20")}
      >
        {isPublished ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
        ) : (
          <Globe className="h-3.5 w-3.5" />
        )}
        {isPublished ? "Live" : "Publish"}
      </Button>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        slug={slug}
        status={status}
        onChange={onStatusChange}
        warnings={warnings}
        canPublish={canPublish}
        onReviewWarning={(w) => {
          setPublishOpen(false);
          onReviewWarning?.(w);
        }}
      />
    </>
  );
}
