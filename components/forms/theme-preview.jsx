"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { backgroundStyle, buildTheme } from "@/lib/forms/theme";

// Respondent-theme choices (stored in form settings), shared by the workspace Themes section and the builder Design panel.
export const ACCENT_PRESETS = ["#6366f1", "#3b82f6", "#0ea5e9", "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#a855f7"];
export const MODE_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "auto", label: "Device" },
];
export const BACKGROUND_OPTIONS = [
  { value: "plain", label: "Plain" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
];
export const RADIUS_OPTIONS = [
  { value: "none", label: "Square" },
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "full", label: "Round" },
];
export const FONT_OPTIONS = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
  { value: "mono", label: "Mono" },
];
export const LAYOUT_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "conversational", label: "One at a time" },
];
export const HEX_RE = /^#[0-9a-f]{6}$/i;

// Miniature respondent page rendered with the real theme tokens (mode, accent, radius, font, background).
export function ThemePreview({ settings, title, className }) {
  const theme = useMemo(() => buildTheme(settings), [settings]);
  return (
    <div
      aria-hidden="true"
      className={cn(theme.className, "overflow-hidden rounded-xl border border-border bg-background p-4 text-foreground", className)}
      style={{ ...theme.style, ...backgroundStyle(theme), backgroundAttachment: "scroll" }}
    >
      <div className="mx-auto max-w-sm space-y-3 rounded-[var(--radius)] border border-border bg-surface-subtle p-4 shadow-sm">
        {settings.showIcon && settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied external logo URL
          <img src={settings.logoUrl} alt="" className="h-6 w-auto" />
        ) : null}
        <p className="text-sm font-semibold">{title || "Your form"}</p>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground">Email address</p>
          <div className="h-8 rounded-[var(--input-box-radius)] border border-border bg-surface-card" />
        </div>
        <div className="flex gap-2">
          <span className="rounded-[var(--input-box-radius)] border border-primary bg-primary/10 px-2.5 py-1 text-[11px]">Option A</span>
          <span className="rounded-[var(--input-box-radius)] border border-border bg-surface-card px-2.5 py-1 text-[11px] text-text-secondary">Option B</span>
        </div>
        <div className="flex h-8 items-center justify-center rounded-[var(--input-box-radius)] bg-primary text-xs font-medium text-primary-foreground">Submit</div>
      </div>
    </div>
  );
}
