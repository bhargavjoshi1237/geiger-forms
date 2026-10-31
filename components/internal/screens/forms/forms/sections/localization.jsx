"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { Label } from "@geiger/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { EmptyState, Field, SectionCard } from "@geiger/ui/screen-kit";
import { Switch } from "@geiger/ui/switch";
import { translatableStrings } from "@/lib/forms/translate";
import { cn } from "@/lib/utils";
import { LOCALES } from "../constants";
import { FIELD_CLS, Note, Stack, TextArea, TextInput } from "./kit";

const nameOf = (code) => LOCALES.find((l) => l.value === code)?.label || code;

function LanguageSelect({ value, options, onChange, placeholder, label }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("h-9", FIELD_CLS)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((code) => (
          <SelectItem key={code} value={code}>
            {nameOf(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StringRow({ item, value, onChange }) {
  const Control = item.multiline ? TextArea : TextInput;
  return (
    <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-4">
      <div className="min-w-0 text-sm">
        <p className="text-[11px] text-text-tertiary">{item.label}</p>
        <p className="whitespace-pre-line break-words text-text-secondary">{item.source}</p>
      </div>
      <Control value={value} onChange={onChange} aria-label={`${item.label}: ${item.source}`} placeholder="Uses the original until translated" />
    </div>
  );
}

// Respondent language: the built-in text language, plus translations of this form's own content with a switcher on the live form.
export function LocalizationSection({ form, draft, settings, set }) {
  const base = LOCALES.find((l) => l.value === settings.locale) || LOCALES[0];
  const translations = useMemo(() => settings.translations || {}, [settings.translations]);
  const added = Object.keys(translations).filter((code) => code !== base.value && LOCALES.some((l) => l.value === code));
  const addable = LOCALES.map((l) => l.value).filter((code) => code !== base.value && !added.includes(code));
  const [chosen, setChosen] = useState(null);
  const [missingOnly, setMissingOnly] = useState(false);
  const [removing, setRemoving] = useState(null);
  const active = added.includes(chosen) ? chosen : added[0] || null;
  const strings = active ? translations[active] || {} : {};

  const groups = useMemo(() => translatableStrings({ title: draft?.title ?? form.title, description: draft?.description ?? form.description, fieldDefs: form.fieldDefs, settings }), [draft?.title, draft?.description, form.title, form.description, form.fieldDefs, settings]);
  const isDone = (item) => Boolean(strings[item.key]?.trim());
  const total = groups.reduce((sum, g) => sum + g.items.length, 0);
  const done = groups.reduce((sum, g) => sum + g.items.filter(isDone).length, 0);
  const shown = missingOnly ? groups.map((g) => ({ ...g, items: g.items.filter((i) => !isDone(i)) })).filter((g) => g.items.length) : groups;

  const setString = (key, value) => set("translations", { ...translations, [active]: { ...strings, [key]: value } });
  const addLanguage = (code) => {
    set("translations", { ...translations, [code]: translations[code] || {} });
    setChosen(code);
  };
  const removeLanguage = () => {
    const { [removing]: _removed, ...rest } = translations;
    set("translations", rest);
    setRemoving(null);
  };

  return (
    <Stack>
      <SectionCard title="Form language" description="The language you write this form in. Also sets the built-in text: buttons, validation messages and date formats.">
        <Field label="Language" className="max-w-xs">
          <LanguageSelect label="Form language" value={base.value} options={LOCALES.map((l) => l.value)} onChange={(v) => set("locale", v)} />
        </Field>
      </SectionCard>

      <SectionCard title="Translations" description="Respondents get a language switcher, and the form opens in their browser's language when it's available. Link to one directly with ?lang=es.">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-end gap-3">
            {added.length ? (
              <Field label="Translating into" className="w-56">
                <LanguageSelect label="Translating into" value={active} options={added} onChange={setChosen} />
              </Field>
            ) : null}
            {addable.length ? (
              <Field label="Add a language" className="w-56">
                <LanguageSelect key={added.length} label="Add a language" value="" options={addable} onChange={addLanguage} placeholder="Choose…" />
              </Field>
            ) : null}
            {active ? (
              <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400" onClick={() => setRemoving(active)}>
                <Trash2 />
                Remove {nameOf(active)}
              </Button>
            ) : null}
          </div>

          {active ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <Badge variant={done === total ? "success" : "neutral"}>
                  {done} of {total} translated
                </Badge>
                <div className="flex items-center gap-2">
                  <Label htmlFor="translations-missing" className="text-xs font-normal text-text-secondary">
                    Show only what&apos;s missing
                  </Label>
                  <Switch id="translations-missing" checked={missingOnly} onCheckedChange={setMissingOnly} />
                </div>
              </div>
              <Note>Answers are stored in the form&apos;s language, so reports and logic stay the same in every language. Keep merge tags like {"{Name}"} unchanged. Emails and PDFs use the form&apos;s language.</Note>
              {shown.length ? (
                shown.map((group) => (
                  <div key={group.id} className="grid gap-3 border-t border-border pt-4">
                    <p className="truncate text-sm font-medium text-foreground">{group.label}</p>
                    {group.items.map((item) => (
                      <StringRow key={item.key} item={item} value={strings[item.key] || ""} onChange={(v) => setString(item.key, v)} />
                    ))}
                  </div>
                ))
              ) : (
                <EmptyState title="Everything's translated" description="Turn off the filter to review the translations." />
              )}
            </>
          ) : (
            <EmptyState title="No translations yet" description="Add a language to translate this form's questions, choices and messages." />
          )}
        </div>
      </SectionCard>

      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {nameOf(removing)}?</DialogTitle>
            <DialogDescription>Its translations are deleted when you save, and respondents can no longer choose this language.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={removeLanguage}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
