"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Field, SectionCard } from "@geiger/ui/screen-kit";
import { cn } from "@/lib/utils";
import { LOCALES } from "../constants";
import { FIELD_CLS, Stack } from "./kit";

// Respondent-facing language for built-in labels (buttons, validation, dates).
export function LocalizationSection({ settings, set }) {
  const current = LOCALES.find((l) => l.value === settings.locale) || LOCALES[0];
  return (
    <Stack>
      <SectionCard title="Form language" description="Translates the form's built-in text — buttons, validation messages and date formats.">
        <Field label="Language" className="max-w-xs">
          <Select value={current.value} onValueChange={(v) => set("locale", v)}>
            <SelectTrigger className={cn("h-9", FIELD_CLS)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </SectionCard>
    </Stack>
  );
}
