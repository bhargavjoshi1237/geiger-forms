"use client";

import { Check } from "lucide-react";

import { Field, SectionCard } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { cn } from "@/lib/utils";
import { Stack, TextInput } from "./kit";

// Accent presets are respondent-theme data (stored in the form), not app chrome.
const ACCENTS = ["#6366f1", "#3b82f6", "#0ea5e9", "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#a855f7"];
const RADII = [
  { value: "none", label: "Square", px: 0 },
  { value: "sm", label: "Small", px: 4 },
  { value: "md", label: "Medium", px: 8 },
  { value: "lg", label: "Large", px: 14 },
  { value: "full", label: "Pill", px: 999 },
];
const FONTS = [
  { value: "sans", label: "Sans", cls: "font-sans" },
  { value: "serif", label: "Serif", cls: "font-serif" },
  { value: "mono", label: "Mono", cls: "font-mono" },
];
const MODES = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "auto", label: "Match device" },
];
const BACKGROUNDS = [
  { value: "plain", label: "Plain" },
  { value: "gradient", label: "Gradient" },
  { value: "image", label: "Image" },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;

function ThemePreview({ settings, title }) {
  const theme = settings.theme || {};
  const accent = HEX_RE.test(theme.accent || "") ? theme.accent : "#6366f1";
  const radius = RADII.find((r) => r.value === theme.radius)?.px ?? 8;
  const light = theme.mode === "light";
  const font = FONTS.find((f) => f.value === theme.font)?.cls || "font-sans";
  const bg =
    theme.background === "image" && settings.coverUrl
      ? { backgroundImage: `url(${settings.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : theme.background === "gradient"
        ? { backgroundImage: `linear-gradient(135deg, ${accent}55, transparent 60%)` }
        : undefined;
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border p-5", light ? "bg-white text-neutral-900" : "bg-neutral-950 text-neutral-100", font)} style={bg}>
      <div className={cn("mx-auto max-w-sm space-y-3 p-4 shadow-lg", light ? "bg-white" : "bg-neutral-900")} style={{ borderRadius: Math.min(radius, 18) }}>
        {settings.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="" className="h-6 w-auto" />
        ) : null}
        <p className="text-sm font-semibold">{title || "Your form"}</p>
        <div className="space-y-1">
          <p className={cn("text-[11px]", light ? "text-neutral-500" : "text-neutral-400")}>Email address</p>
          <div className={cn("h-8 border", light ? "border-neutral-300" : "border-neutral-700")} style={{ borderRadius: Math.min(radius, 12) }} />
        </div>
        <div className="flex gap-2">
          {["Option A", "Option B"].map((o, i) => (
            <span key={o} className="border px-2.5 py-1 text-[11px]" style={{ borderRadius: Math.min(radius, 999), borderColor: i === 0 ? accent : undefined, color: i === 0 ? accent : undefined }}>
              {o}
            </span>
          ))}
        </div>
        <button type="button" tabIndex={-1} className="w-full py-2 text-xs font-medium text-white" style={{ background: accent, borderRadius: Math.min(radius, 999) }}>
          Submit
        </button>
      </div>
    </div>
  );
}

export function ThemesSection({ draft, settings, set, setGroup }) {
  const theme = settings.theme || {};
  const accent = theme.accent || "";
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Stack>
        <SectionCard title="Colour mode">
          <Tabs value={theme.mode || "dark"} onValueChange={(v) => setGroup("theme", { mode: v })}>
            <TabsList>
              {MODES.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </SectionCard>

        <SectionCard title="Accent colour" description="Used for buttons, selections and the progress bar.">
          <div className="space-y-3">
            <ToggleGroup
              type="single"
              spacing={2}
              value={accent ? accent.toLowerCase() : "default"}
              onValueChange={(v) => v && setGroup("theme", { accent: v === "default" ? "" : v })}
              className="flex-wrap"
            >
              {ACCENTS.map((c) => (
                <ToggleGroupItem
                  key={c}
                  value={c}
                  aria-label={`Accent ${c}`}
                  className="h-8 w-8 min-w-8 rounded-full border border-border p-0 transition-transform hover:scale-110"
                  style={{ background: c }}
                >
                  {accent.toLowerCase() === c ? <Check className="size-4 text-white" /> : null}
                </ToggleGroupItem>
              ))}
              <ToggleGroupItem value="default" className="h-8 rounded-full border border-border px-3 text-xs font-normal text-text-secondary hover:bg-transparent hover:text-foreground data-[state=on]:bg-surface-active data-[state=on]:text-foreground">
                Default
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Custom accent colour"
                value={HEX_RE.test(accent) ? accent : "#6366f1"}
                onChange={(e) => setGroup("theme", { accent: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface-card p-1"
              />
              <TextInput value={accent} onChange={(v) => setGroup("theme", { accent: v.trim() })} placeholder="#6366f1" className="w-36 font-mono" />
              {accent && !HEX_RE.test(accent) ? <span className="text-xs text-red-400">Use a 6-digit hex colour.</span> : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Shape & type">
          <div className="grid gap-4">
            <Field label="Corner radius">
              <Tabs value={theme.radius || "md"} onValueChange={(v) => setGroup("theme", { radius: v })}>
                <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
                  {RADII.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Field>
            <Field label="Font">
              <Tabs value={theme.font || "sans"} onValueChange={(v) => setGroup("theme", { font: v })}>
                <TabsList>
                  {FONTS.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Background & images">
          <div className="grid gap-4">
            <Field label="Background">
              <Tabs value={theme.background || "plain"} onValueChange={(v) => setGroup("theme", { background: v })}>
                <TabsList>
                  {BACKGROUNDS.map((t) => (
                    <TabsTrigger key={t.value} value={t.value}>
                      {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Field>
            <Field label="Cover image URL" hint={theme.background === "image" ? "Shown behind the form." : "Shown as a header image when the background is set to Image."}>
              <TextInput value={settings.coverUrl} onChange={(v) => set("coverUrl", v)} placeholder="https://…/cover.jpg" />
            </Field>
            <Field label="Logo URL" hint="Displayed above the form title.">
              <TextInput value={settings.logoUrl} onChange={(v) => set("logoUrl", v)} placeholder="https://…/logo.svg" />
            </Field>
          </div>
        </SectionCard>
      </Stack>

      <div className="xl:sticky xl:top-0 xl:self-start">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-text-secondary">Live preview</p>
        <ThemePreview settings={settings} title={draft.title} />
      </div>
    </div>
  );
}
