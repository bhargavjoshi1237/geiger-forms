"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { Input } from "@geiger/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { FontPicker } from "@/components/forms/font-picker";
import { ImageInput } from "@/components/forms/image-input";
import { ThemeGallery } from "@/components/forms/theme-gallery";
import { ACCENT_PRESETS, BACKGROUND_OPTIONS, HEX_RE, LAYOUT_OPTIONS, MODE_OPTIONS, RADIUS_OPTIONS, ThemePreview } from "@/components/forms/theme-preview";
import { ControlLabel, FieldRow, Segmented, SubtleNote, TextInput, ToggleRow } from "./builder-controls";
import { CoverPicker } from "./cover-picker";

const RADIUS_SHORT = { none: "Square", sm: "S", md: "M", lg: "L", full: "Round" };

function Group({ title, children }) {
  return (
    <div className="space-y-3 border-t border-border pt-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{title}</p>
      {children}
    </div>
  );
}

function AccentPicker({ value, onChange }) {
  const accent = HEX_RE.test(value || "") ? value.toLowerCase() : "";
  return (
    <div className="space-y-2">
      <ToggleGroup type="single" spacing={1.5} value={accent || "default"} onValueChange={(v) => v && onChange(v === "default" ? "" : v)} className="flex-wrap justify-start">
        <ToggleGroupItem value="default" aria-label="Default accent" title="Default" className="size-6 min-w-6 rounded-full border border-border-strong bg-[conic-gradient(var(--foreground)_0_50%,var(--background)_0)] p-0 hover:bg-[conic-gradient(var(--foreground)_0_50%,var(--background)_0)] data-[state=on]:ring-2 data-[state=on]:ring-border-strong data-[state=on]:ring-offset-1 data-[state=on]:ring-offset-background" />
        {ACCENT_PRESETS.map((c) => (
          <ToggleGroupItem key={c} value={c} aria-label={`Accent ${c}`} title={c} className="size-6 min-w-6 rounded-full p-0 transition-transform hover:scale-110 data-[state=on]:ring-2 data-[state=on]:ring-border-strong data-[state=on]:ring-offset-1 data-[state=on]:ring-offset-background" style={{ background: c }}>
            {accent === c ? <Check className="size-3.5 text-white" /> : null}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="flex items-center gap-2">
        <Input type="color" aria-label="Custom accent colour" value={accent || "#6366f1"} onChange={(e) => onChange(e.target.value)} className="w-10 shrink-0 cursor-pointer bg-surface-card p-1" />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value.trim())} placeholder="#6366f1" aria-label="Accent hex" className="h-8 bg-surface-card font-mono text-xs placeholder:text-text-tertiary" />
      </div>
      {value && !HEX_RE.test(value) ? <p className="text-[11px] text-red-600 dark:text-red-400">Use a 6-digit hex colour.</p> : null}
    </div>
  );
}

// Builder "Design" panel: themes, mode, accent, background, corners, fonts, layout, cover and branding with a live preview.
export const DesignSection = memo(function DesignSection({ settings, title, formId, projectId, onChange }) {
  const theme = settings.theme || {};
  const setTheme = (patch, key) => onChange({ theme: { ...theme, ...patch } }, key);

  return (
    <div className="space-y-3">
      <ThemePreview settings={settings} title={title} className="p-3" />

      <Group title="Themes">
        <ThemeGallery compact settings={settings} projectId={projectId} onApply={onChange} />
      </Group>

      <Group title="Colour">
        <FieldRow label="Colour mode">
          <Segmented value={theme.mode || "dark"} options={MODE_OPTIONS} onChange={(mode) => setTheme({ mode })} />
        </FieldRow>
        <div className="space-y-1.5">
          <ControlLabel hint="Buttons, selections and the progress bar.">Accent colour</ControlLabel>
          <AccentPicker value={theme.accent || ""} onChange={(accent) => setTheme({ accent }, "design:accent")} />
        </div>
      </Group>

      <Group title="Page background">
        <Segmented value={theme.background || "plain"} options={BACKGROUND_OPTIONS} onChange={(background) => setTheme({ background })} />
        {theme.background === "image" ? (
          <div className="space-y-1.5">
            <ControlLabel hint="Fills the page behind the form, softly faded into the theme colour.">Background image</ControlLabel>
            <ImageInput compact formId={formId} value={settings.coverUrl} onChange={(coverUrl) => onChange({ coverUrl }, "design:bg-image")} placeholder="https://…/background.jpg" label="background image" />
          </div>
        ) : theme.background === "gradient" ? (
          <SubtleNote>A soft glow tinted by the accent colour.</SubtleNote>
        ) : null}
      </Group>

      <Group title="Shape & type">
        <FieldRow label="Corners">
          <Segmented value={theme.radius || "md"} options={RADIUS_OPTIONS.map((o) => ({ value: o.value, label: RADIUS_SHORT[o.value] }))} onChange={(radius) => setTheme({ radius })} />
        </FieldRow>
        <FieldRow label="Body font">
          <FontPicker compact label="Body font" value={theme.font || "sans"} onChange={(font) => setTheme({ font })} />
        </FieldRow>
        <FieldRow label="Heading font" hint="Form, page and ending titles.">
          <FontPicker compact label="Heading font" value={theme.headingFont || ""} inheritLabel="Same as body" onChange={(headingFont) => setTheme({ headingFont })} />
        </FieldRow>
        <SubtleNote>Fonts load via Bunny Fonts, so respondents&apos; IP addresses never reach Google.</SubtleNote>
      </Group>

      <Group title="Layout">
        <Segmented value={settings.layout === "conversational" ? "conversational" : "classic"} options={LAYOUT_OPTIONS} onChange={(layout) => onChange({ layout })} />
        <SubtleNote>{settings.layout === "conversational" ? "One question per screen, with keyboard shortcuts." : "All questions on a page, with page breaks as steps."}</SubtleNote>
        <ToggleRow label="Progress bar" hint="Shows how far along respondents are; turn off to hide it." checked={settings.progressBar !== false} onCheckedChange={(progressBar) => onChange({ progressBar })} />
      </Group>

      <Group title="Header">
        <CoverPicker formId={formId} settings={settings} onChange={(patch) => onChange(patch, "design:cover")} />
        <ToggleRow label="Show logo" hint="Displayed above the form title." checked={settings.showIcon} onCheckedChange={(showIcon) => onChange({ showIcon })} />
        {settings.showIcon ? (
          <>
            <div className="space-y-1.5">
              <ControlLabel>Logo</ControlLabel>
              <ImageInput compact formId={formId} value={settings.logoUrl} onChange={(logoUrl) => onChange({ logoUrl }, "design:logo")} placeholder="https://…/logo.png" label="logo" fit="contain" />
            </div>
            <FieldRow label="Logo alt text" hint="Read aloud by screen readers; leave blank if the title already names the brand.">
              <TextInput value={settings.logoAlt} onChange={(logoAlt) => onChange({ logoAlt }, "design:logo-alt")} placeholder="e.g. Halcyon Studio" className="text-xs" />
            </FieldRow>
          </>
        ) : null}
        <ToggleRow label="Geiger branding" hint="“Made with Geiger Forms” footer." checked={settings.branding} onCheckedChange={(branding) => onChange({ branding })} />
      </Group>
    </div>
  );
});
