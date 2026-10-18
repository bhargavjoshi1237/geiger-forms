"use client";

import { Check } from "lucide-react";

import { Field, SectionCard } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { ACCENT_PRESETS, BACKGROUND_OPTIONS, FONT_OPTIONS, HEX_RE, MODE_OPTIONS, RADIUS_OPTIONS, ThemePreview } from "@/components/forms/theme-preview";
import { Stack, TextInput } from "./kit";

export function ThemesSection({ draft, settings, set, setGroup }) {
  const theme = settings.theme || {};
  const accent = theme.accent || "";
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Stack>
        <SectionCard title="Colour mode">
          <Tabs value={theme.mode || "dark"} onValueChange={(v) => setGroup("theme", { mode: v })}>
            <TabsList>
              {MODE_OPTIONS.map((t) => (
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
              {ACCENT_PRESETS.map((c) => (
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
              {accent && !HEX_RE.test(accent) ? <span className="text-xs text-red-600 dark:text-red-400">Use a 6-digit hex colour.</span> : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Shape & type">
          <div className="grid gap-4">
            <Field label="Corner radius">
              <Tabs value={theme.radius || "md"} onValueChange={(v) => setGroup("theme", { radius: v })}>
                <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
                  {RADIUS_OPTIONS.map((t) => (
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
                  {FONT_OPTIONS.map((t) => (
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
                  {BACKGROUND_OPTIONS.map((t) => (
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
