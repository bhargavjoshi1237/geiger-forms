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
export const LAYOUT_OPTIONS = [
  { value: "classic", label: "Classic" },
  { value: "conversational", label: "One at a time" },
];
export const HEX_RE = /^#[0-9a-f]{6}$/i;

// Built-in looks shown next to the workspace's saved themes; applying one replaces the form's theme tokens only.
export const THEME_PRESETS = [
  { id: "geiger", name: "Geiger", theme: { mode: "dark", accent: "", radius: "md", font: "sans", headingFont: "", background: "plain" } },
  { id: "daylight", name: "Daylight", theme: { mode: "light", accent: "", radius: "md", font: "sans", headingFont: "", background: "plain" } },
  { id: "midnight", name: "Midnight", theme: { mode: "dark", accent: "#6366f1", radius: "lg", font: "inter", headingFont: "", background: "gradient" } },
  { id: "ocean", name: "Ocean", theme: { mode: "dark", accent: "#0ea5e9", radius: "lg", font: "manrope", headingFont: "", background: "gradient" } },
  { id: "forest", name: "Forest", theme: { mode: "dark", accent: "#10b981", radius: "md", font: "dm-sans", headingFont: "fraunces", background: "gradient" } },
  { id: "editorial", name: "Editorial", theme: { mode: "light", accent: "#b45309", radius: "none", font: "lora", headingFont: "playfair-display", background: "plain" } },
  { id: "studio", name: "Studio", theme: { mode: "light", accent: "#3b82f6", radius: "lg", font: "plus-jakarta-sans", headingFont: "", background: "plain" } },
  { id: "blossom", name: "Blossom", theme: { mode: "light", accent: "#ec4899", radius: "full", font: "quicksand", headingFont: "dm-serif-display", background: "gradient" } },
  { id: "poster", name: "Poster", theme: { mode: "dark", accent: "#ef4444", radius: "sm", font: "work-sans", headingFont: "bebas-neue", background: "plain" } },
  { id: "terminal", name: "Terminal", theme: { mode: "dark", accent: "#84cc16", radius: "none", font: "jetbrains-mono", headingFont: "", background: "plain" } },
];

// Miniature respondent page rendered with the real theme tokens (mode, accent, radius, fonts, background).
export function ThemePreview({ settings, title, className }) {
  const theme = useMemo(() => buildTheme(settings), [settings]);
  return (
    <div
      aria-hidden="true"
      className={cn(theme.className, "overflow-hidden rounded-xl border border-border bg-background p-4 text-foreground", className)}
      style={{ ...theme.style, ...backgroundStyle(theme), backgroundAttachment: "scroll" }}
    >
      {theme.fontUrl ? <link rel="stylesheet" href={theme.fontUrl} /> : null}
      <div className="mx-auto max-w-sm space-y-3 rounded-[var(--radius)] border border-border bg-surface-subtle p-4 shadow-sm">
        {settings.showIcon && settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied external logo URL
          <img src={settings.logoUrl} alt="" className="h-6 w-auto" />
        ) : null}
        <p className="font-(family-name:--gf-font-heading) text-base font-semibold">{title || "Your form"}</p>
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
