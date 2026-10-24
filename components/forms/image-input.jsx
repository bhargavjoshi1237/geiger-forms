"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { cn } from "@/lib/utils";
import { imageSource } from "@/lib/forms/media";
import { MEDIA_MAX_MB, MEDIA_TYPES, uploadFormImage } from "@/lib/supabase/storage";

// Image setting (logo, cover, background): upload to the form's public media, or paste a URL as a fallback.
export function ImageInput({ formId, value, onChange, placeholder = "https://…/image.jpg", label = "image", fit = "cover", compact = false }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const url = value || "";
  const invalid = Boolean(url) && !imageSource(url);

  const upload = async (file) => {
    if (!MEDIA_TYPES.includes(file.type)) return toast.error("Use a JPG, PNG, WebP, GIF or AVIF image.");
    if (file.size > MEDIA_MAX_MB * 1024 * 1024) return toast.error(`Images must be ${MEDIA_MAX_MB} MB or smaller.`);
    setUploading(true);
    const uploaded = await uploadFormImage(formId, file);
    setUploading(false);
    if (!uploaded) return toast.error("Couldn't upload the image. Paste an image link instead.");
    onChange(uploaded);
    toast.success("Image uploaded");
  };

  return (
    <div className="flex items-center gap-2">
      <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface-card", compact ? "size-8" : "size-9")}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded or user-supplied image URL
          <img src={url} alt="" className={cn("size-full", fit === "contain" ? "object-contain p-0.5" : "object-cover")} />
        ) : (
          <ImageIcon className="size-3.5 text-text-tertiary" aria-hidden="true" />
        )}
      </span>
      <div className="relative min-w-0 flex-1">
        <Input
          type="url"
          value={url}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={placeholder}
          aria-label={`${label} URL`}
          aria-invalid={invalid || undefined}
          className={cn("bg-surface-card placeholder:text-text-tertiary", compact ? "h-8 text-xs" : "h-9 text-sm", url && "pr-8", invalid && "border-red-500/40")}
        />
        {url ? (
          <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${label}`} onClick={() => onChange("")} className="absolute right-1 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-foreground">
            <X />
          </Button>
        ) : null}
      </div>
      {formId ? (
        <>
          <Button type="button" variant="outline" size={compact ? "sm" : "default"} aria-label={`Upload ${label}`} onClick={() => fileRef.current?.click()} disabled={uploading} className={cn("shrink-0", compact && "text-xs")}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
            Upload
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept={MEDIA_TYPES.join(",")}
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
        </>
      ) : null}
    </div>
  );
}
