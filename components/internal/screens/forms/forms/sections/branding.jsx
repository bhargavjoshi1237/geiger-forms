"use client";

import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Stack, TextInput } from "./kit";

// Logo, form icon and the "Powered by Geiger Forms" footer.
export function BrandingSection({ settings, set }) {
  return (
    <Stack>
      <SectionCard title="Your brand">
        <div className="grid gap-4">
          <Field label="Logo URL" hint="PNG or SVG, shown above the form title.">
            <TextInput value={settings.logoUrl} onChange={(v) => set("logoUrl", v)} placeholder="https://…/logo.svg" />
          </Field>
          {settings.logoUrl ? (
            <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-surface-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logoUrl} alt="Logo preview" className="max-h-10 w-auto" />
            </div>
          ) : null}
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
