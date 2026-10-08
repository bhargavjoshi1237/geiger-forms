"use client";

import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { coverBackground } from "@/components/forms/builder/cover-presets";

// Remaining spots when the form shows its response limit (null when hidden or unlimited).
export function spotsLeft(form) {
  const settings = form.settings || {};
  const limit = Number(settings.responseLimit) || 0;
  if (!settings.showResponseLimit || limit <= 0) return null;
  return { left: Math.max(0, limit - (Number(form.responses) || 0)), total: limit };
}

export function SpotsBadge({ form, tr }) {
  const spots = spotsLeft(form);
  if (!spots) return null;
  const low = spots.left <= Math.max(3, Math.round(spots.total * 0.1));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums",
        low ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-surface-card text-text-secondary",
      )}
    >
      <Users className="size-3" aria-hidden="true" />
      {tr("spotsLeft", { left: spots.left, total: spots.total })}
    </span>
  );
}

// Cover band (image or builder gradient preset) + optional logo, title and description.
export function FormHero({ form, title, description, tr, compact = false, meta }) {
  const settings = form.settings || {};
  const showCover = settings.coverStyle === "cover";
  const logo = settings.showIcon && settings.logoUrl ? settings.logoUrl : "";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-subtle">
      {showCover && <div className="h-28 sm:h-40" style={{ background: coverBackground(settings) }} aria-hidden="true" />}
      <div className={cn("px-6 sm:px-8", compact ? "py-5" : "py-6 sm:py-7")}>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            className={cn("mb-4 size-14 rounded-xl border border-border bg-surface-card object-cover shadow-sm", showCover && "-mt-14 sm:-mt-16")}
          />
        )}
        <h1 className={cn("font-semibold tracking-tight text-foreground", compact ? "text-xl" : "text-2xl sm:text-3xl")}>{title}</h1>
        {description && !compact && <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-line text-muted-foreground sm:text-[15px]">{description}</p>}
        {(meta || spotsLeft(form)) && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
            {meta}
            <SpotsBadge form={form} tr={tr} />
          </div>
        )}
      </div>
    </div>
  );
}
