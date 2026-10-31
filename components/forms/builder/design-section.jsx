"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { CSS_HOOKS, MAX_CUSTOM_CSS, checkCustomCss } from "@/lib/forms/custom-css";
import { FontPicker } from "@/components/forms/font-picker";
import { ImageInput } from "@/components/forms/image-input";
import { ThemeGallery } from "@/components/forms/theme-gallery";
import { ACCENT_PRESETS, BACKGROUND_OPTIONS, HEX_RE, LAYOUT_OPTIONS, MODE_OPTIONS, RADIUS_OPTIONS, ThemePreview } from "@/components/forms/theme-preview";
import { ControlLabel, FieldRow, Segmented, SubtleNote, TextInput, ToggleRow } from "./builder-controls";
import { CoverPicker } from "./cover-picker";

const RADIUS_SHORT = { none: "Square", sm: "S", md: "M", lg: "L", full: "Round" };

const PAGE_LAYOUTS = [
  { value: "centered", label: "Centred" },
  { value: "split", label: "Split" },
  { value: "side-image", label: "Side image" },
];
const SIDE_POSITIONS = [
  { value: "left", label: "Start" },
  { value: "right", label: "End" },
];

// Per-element choices; the values match ELEMENT_RULES in lib/forms/custom-css.js, and the first of each is the unstyled default.
const ELEMENT_CONTROLS = [
  { key: "titleSize", label: "Title size", options: [["md", "Default"], ["sm", "Small"], ["lg", "Large"]] },
  { key: "titleAlign", label: "Title alignment", options: [["start", "Start"], ["center", "Centre"]] },
  { key: "titleCase", label: "Heading case", options: [["normal", "As typed"], ["upper", "Uppercase"]] },
  { key: "labelSize", label: "Question size", options: [["md", "Default"], ["sm", "Small"], ["lg", "Large"]] },
  { key: "labelWeight", label: "Question weight", options: [["medium", "Medium"], ["normal", "Regular"], ["bold", "Bold"]] },
  { key: "labelStyle", label: "Choice questions", options: [["plain", "Text"], ["display", "Heading"]] },
  { key: "numbering", label: "Question numbers", options: [["off", "Off"], ["on", "On"]] },
  { key: "inputStyle", label: "Inputs", options: [["box", "Box"], ["underline", "Underline"], ["filled", "Filled"]] },
  { key: "buttonStyle", label: "Button", options: [["solid", "Solid"], ["outline", "Outline"], ["gradient", "Gradient"]] },
  { key: "buttonShape", label: "Button shape", options: [["default", "Match corners"], ["pill", "Pill"]] },
  { key: "buttonWidth", label: "Button width", options: [["auto", "Fit"], ["full", "Full"]] },
  { key: "cardStyle", label: "Sections", options: [["card", "Card"], ["glass", "Glass"], ["flat", "Flat"]] },
  { key: "progressStyle", label: "Multi-page progress", options: [["bar", "Bar"], ["steps", "Steps"]] },
];

function ElementStyles({ theme, setTheme }) {
  const elements = theme.elements || {};
  return ELEMENT_CONTROLS.map(({ key, label, options }) => (
    <FieldRow key={key} label={label}>
      <Segmented value={elements[key] || options[0][0]} options={options.map(([value, text]) => ({ value, label: text }))} onChange={(value) => setTheme({ elements: { ...elements, [key]: value } })} />
    </FieldRow>
  ));
}

function CustomCssEditor({ value, onChange }) {
  const { error } = checkCustomCss(value);
  return (
    <div className="space-y-1.5">
      <ControlLabel hint="Applies only inside this form, on the live page and in the preview. It can't load images, fonts or other files.">Custom CSS</ControlLabel>
      <Textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        spellCheck={false}
        maxLength={MAX_CUSTOM_CSS + 1}
        aria-label="Custom CSS"
        aria-invalid={error ? true : undefined}
        placeholder={'[data-gf-part="title"] {\n  letter-spacing: -0.02em;\n}'}
        className="min-h-28 resize-y bg-surface-card font-mono text-xs placeholder:text-text-tertiary"
      />
      {error ? <p role="alert" className="text-[11px] text-red-600 dark:text-red-400">{error}</p> : null}
      <details className="text-[11px] leading-4 text-text-tertiary">
        <summary className="cursor-pointer">Selectors you can target</summary>
        <ul className="mt-1 space-y-0.5 font-mono">
          {CSS_HOOKS.map((hook) => <li key={hook} className="break-all">{hook}</li>)}
        </ul>
      </details>
    </div>
  );
}

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

function GradientEndPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Input type="color" aria-label="Second accent colour" value={HEX_RE.test(value || "") ? value.toLowerCase() : "#ff4d2e"} onChange={(e) => onChange(e.target.value)} className="w-10 shrink-0 cursor-pointer bg-surface-card p-1" />
      <Input value={value || ""} onChange={(e) => onChange(e.target.value.trim())} placeholder="None" aria-label="Second accent hex" className="h-8 bg-surface-card font-mono text-xs placeholder:text-text-tertiary" />
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
          <Segmented value={theme.mode || "dark"} options={MODE_OPTIONS} onChange={(mode) => setTheme({ mode, palette: "" })} />
        </FieldRow>
        <div className="space-y-1.5">
          <ControlLabel hint="Buttons, selections and the progress bar.">Accent colour</ControlLabel>
          <AccentPicker value={theme.accent || ""} onChange={(accent) => setTheme({ accent }, "design:accent")} />
        </div>
        {HEX_RE.test(theme.accent || "") ? (
          <div className="space-y-1.5">
            <ControlLabel hint="Blends with the accent on gradient buttons, the progress bar and the glow.">Second accent</ControlLabel>
            <GradientEndPicker value={theme.accent2 || ""} onChange={(accent2) => setTheme({ accent2 }, "design:accent2")} />
          </div>
        ) : null}
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
        ) : theme.background === "glow" ? (
          <SubtleNote>Two soft glows in the page corner, tinted by the accent colours.</SubtleNote>
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
        <FieldRow label="Page layout" hint="Split and side image apply on large screens; phones show the image as a band above the form. Embeds stay single-column.">
          <Segmented value={settings.pageLayout || "centered"} options={PAGE_LAYOUTS} onChange={(pageLayout) => onChange({ pageLayout })} />
        </FieldRow>
        {settings.pageLayout === "split" || settings.pageLayout === "side-image" ? (
          <>
            <FieldRow label="Image side">
              <Segmented value={settings.sidePosition || "left"} options={SIDE_POSITIONS} onChange={(sidePosition) => onChange({ sidePosition })} />
            </FieldRow>
            <div className="space-y-1.5">
              <ControlLabel hint="Without an image, the panel shows a glow tinted by the accent colour.">Side image</ControlLabel>
              <ImageInput compact formId={formId} value={settings.sideImageUrl} onChange={(sideImageUrl) => onChange({ sideImageUrl }, "design:side-image")} placeholder="https://…/side.jpg" label="side image" />
            </div>
            <FieldRow label="Eyebrow" hint="Small line above the headline.">
              <TextInput value={settings.sideEyebrow} onChange={(sideEyebrow) => onChange({ sideEyebrow }, "design:side-eyebrow")} placeholder="e.g. Las Vegas · March 6" className="text-xs" />
            </FieldRow>
            <FieldRow label="Headline">
              <TextInput value={settings.sideHeadline} onChange={(sideHeadline) => onChange({ sideHeadline }, "design:side-headline")} placeholder="e.g. Front row. No filter." className="text-xs" />
            </FieldRow>
            <FieldRow label="Tags" hint="Separate tags with commas.">
              <TextInput value={settings.sideTags} onChange={(sideTags) => onChange({ sideTags }, "design:side-tags")} placeholder="e.g. 12-fight card, Doors 5:00 PM" className="text-xs" />
            </FieldRow>
            <FieldRow label="Image credit">
              <TextInput value={settings.sideCredit} onChange={(sideCredit) => onChange({ sideCredit }, "design:side-credit")} placeholder="e.g. Photo: Jane Doe" className="text-xs" />
            </FieldRow>
            <FieldRow label="Side image alt text" hint="Leave blank if the image is only decorative.">
              <TextInput value={settings.sideImageAlt} onChange={(sideImageAlt) => onChange({ sideImageAlt }, "design:side-alt")} className="text-xs" />
            </FieldRow>
          </>
        ) : null}
      </Group>

      <Group title="Elements">
        <ElementStyles theme={theme} setTheme={setTheme} />
      </Group>

      <Group title="Advanced">
        <CustomCssEditor value={settings.customCss} onChange={(customCss) => onChange({ customCss }, "design:css")} />
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
