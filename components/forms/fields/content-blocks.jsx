"use client";

import { ImageOff, Quote, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { imageSource, videoSource } from "@/lib/forms/media";

function Paragraphs({ text, className }) {
  return (
    <div className={cn("space-y-2 leading-relaxed", className)}>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {para}
        </p>
      ))}
    </div>
  );
}

// Builder previews show where a media block will appear; the live form skips an empty block.
function MissingMedia({ Icon, text }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong bg-surface-card text-xs text-text-tertiary">
      <Icon className="size-6" aria-hidden="true" />
      {text}
    </div>
  );
}

function Caption({ text }) {
  return text ? <figcaption className="text-center text-xs leading-relaxed text-text-tertiary">{text}</figcaption> : null;
}

// Statement: a headline and optional body; in the conversational view it is its own screen with a continue button.
export function StatementBlock({ label, body, large }) {
  return (
    <div className={cn(!large && "rounded-xl border border-border bg-surface-card px-5 py-4")}>
      <Quote className={cn("text-primary", large ? "mb-4 size-7" : "mb-2.5 size-4")} aria-hidden="true" />
      {label && <h2 className={cn("font-semibold tracking-tight text-foreground", large ? "text-2xl sm:text-3xl" : "text-base")}>{label}</h2>}
      {body && <Paragraphs text={body} className={cn("text-text-secondary", label && (large ? "mt-3" : "mt-1.5"), large ? "text-base sm:text-lg" : "text-sm")} />}
    </div>
  );
}

export function ImageBlock({ field, caption, preview }) {
  const src = imageSource(field.config?.url);
  if (!src) return preview ? <MissingMedia Icon={ImageOff} text="Add an image in the field settings." /> : null;
  return (
    <figure className="grid gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={field.config?.alt || ""} loading="lazy" decoding="async" className="mx-auto max-h-[28rem] w-auto max-w-full rounded-xl border border-border object-contain" />
      <Caption text={caption} />
    </figure>
  );
}

// YouTube/Vimeo play in privacy-enhanced, sandboxed players; direct video files use the native player.
export function VideoBlock({ field, title, caption, preview }) {
  const source = videoSource(field.config?.url);
  if (!source) return preview ? <MissingMedia Icon={VideoOff} text="Add a YouTube, Vimeo or MP4 link in the field settings." /> : null;
  return (
    <figure className="grid gap-2">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
        {source.kind === "embed" ? (
          <iframe
            src={source.src}
            title={title || `${source.provider} video`}
            loading="lazy"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            className="size-full border-0"
          />
        ) : (
          <video src={source.src} controls preload="metadata" playsInline aria-label={title} className="size-full" />
        )}
      </div>
      <Caption text={caption} />
    </figure>
  );
}
