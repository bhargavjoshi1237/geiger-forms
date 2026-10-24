"use client";

import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { ImageInput } from "@/components/forms/image-input";
import { Stack, TextInput } from "./kit";

// Logo, form icon and the "Powered by Geiger Forms" footer.
export function BrandingSection({ form, settings, set }) {
  return (
    <Stack>
      <SectionCard title="Your brand">
        <div className="grid gap-4">
          <Field label="Logo" hint="Upload an image or link a PNG or SVG; shown above the form title.">
            <ImageInput formId={form.id} value={settings.logoUrl} onChange={(v) => set("logoUrl", v)} placeholder="https://…/logo.svg" label="logo" fit="contain" />
          </Field>
          {settings.logoUrl ? (
            <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-surface-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logoUrl} alt="Logo preview" className="max-h-10 w-auto" />
            </div>
          ) : null}
          <Field label="Logo alt text" hint="Read aloud by screen readers; leave blank if the title already names the brand.">
            <TextInput value={settings.logoAlt} onChange={(v) => set("logoAlt", v)} placeholder="e.g. Halcyon Studio" />
          </Field>
        </div>
      </SectionCard>
      <SectionCard title="White-label">
        <SettingsList>
          <SettingRow title="Show form icon" description="Displays the form's icon next to its title." checked={Boolean(settings.showIcon)} onCheckedChange={(v) => set("showIcon", v)} />
          <SettingRow
            title="“Powered by Geiger Forms” footer"
            description="Turn off to remove Geiger branding from the public form."
            checked={settings.branding !== false}
            onCheckedChange={(v) => set("branding", v)}
          />
        </SettingsList>
      </SectionCard>
    </Stack>
  );
}
