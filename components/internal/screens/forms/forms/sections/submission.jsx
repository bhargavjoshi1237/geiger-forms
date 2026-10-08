"use client";

import { Checkbox } from "@geiger/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { cn } from "@/lib/utils";
import { EDIT_WINDOWS } from "../constants";
import { FIELD_CLS, NumberInput, Stack, TextArea, TextInput, inputFields } from "./kit";

// Schedule, limits, review/edit rules, attestation, policy acknowledgement and duplicate detection.
export function SubmissionSection({ form, settings, set, setGroup }) {
  const attestation = settings.attestation || {};
  const policy = settings.policy || {};
  const duplicates = settings.duplicates || {};
  const pickable = inputFields(form.fieldDefs).filter((f) => ["text", "email", "phone", "name", "number", "url", "hidden"].includes(f.type));
  const toggleDupField = (id, on) => {
    const ids = new Set(duplicates.fieldIds || []);
    if (on) ids.add(id);
    else ids.delete(id);
    setGroup("duplicates", { fieldIds: [...ids] });
  };

  return (
    <Stack>
      <SectionCard title="Schedule" description="Accept responses only between these dates (inclusive).">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opens on">
            <TextInput type="date" value={settings.openDate} onChange={(v) => set("openDate", v)} className="[color-scheme:dark]" />
          </Field>
          <Field label="Closes after">
            <TextInput type="date" value={settings.closeDate} onChange={(v) => set("closeDate", v)} className="[color-scheme:dark]" />
          </Field>
          <Field label="Closed message" className="sm:col-span-2" hint="Shown outside the schedule, or once the limit is reached.">
            <TextArea value={settings.closedMessage} onChange={(v) => set("closedMessage", v)} rows={2} placeholder="This form is no longer accepting responses." />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Response limit">
        <div className="grid gap-4">
          <Field label="Maximum responses" hint="Leave empty for unlimited." className="max-w-xs">
            <NumberInput value={settings.responseLimit} min={1} onChange={(v) => set("responseLimit", v)} placeholder="Unlimited" />
          </Field>
          <SettingsList>
            <SettingRow title="Show remaining spots" description="e.g. “12 spots left” above the form." checked={Boolean(settings.showResponseLimit)} onCheckedChange={(v) => set("showResponseLimit", v)} />
          </SettingsList>
        </div>
      </SectionCard>

      <SectionCard title="Review & editing">
        <div className="grid gap-4">
          <Field label="Minimum review time (seconds)" hint="Blocks submissions completed faster than this — catches bots and careless clicks." className="max-w-xs">
            <NumberInput value={settings.minReviewSeconds} min={0} onChange={(v) => set("minReviewSeconds", v)} placeholder="Off" />
          </Field>
          <Field label="Respondent edit link" hint="After submitting, respondents get a private link to change their answers for this long.">
            <Tabs value={settings.editWindow || "disabled"} onValueChange={(v) => set("editWindow", v)}>
              <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
                {EDIT_WINDOWS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </Field>
          <SettingsList>
            <SettingRow title="Allow submitting on behalf of someone" description="Respondents can name the person they're filling this in for." checked={Boolean(settings.allowDelegate)} onCheckedChange={(v) => set("allowDelegate", v)} />
          </SettingsList>
        </div>
      </SectionCard>

      <SectionCard title="Attestation" description="A required confirmation checkbox right before submit.">
        <SettingsList>
          <SettingRow title="Require attestation" checked={Boolean(attestation.enabled)} onCheckedChange={(v) => setGroup("attestation", { enabled: v })} />
        </SettingsList>
        {attestation.enabled ? (
          <Field label="Statement" className="mt-4">
            <TextArea value={attestation.statement} onChange={(v) => setGroup("attestation", { statement: v })} rows={2} />
          </Field>
        ) : null}
      </SectionCard>

      <SectionCard title="Policy acknowledgement" description="Respondents read a policy and confirm before the form opens.">
        <SettingsList>
          <SettingRow title="Require policy acknowledgement" checked={Boolean(policy.enabled)} onCheckedChange={(v) => setGroup("policy", { enabled: v })} />
        </SettingsList>
        {policy.enabled ? (
          <div className="mt-4 grid gap-4">
            <Field label="Policy title">
              <TextInput value={policy.title} onChange={(v) => setGroup("policy", { title: v })} placeholder="Acceptable use policy" />
            </Field>
            <Field label="Policy text">
              <TextArea value={policy.body} onChange={(v) => setGroup("policy", { body: v })} rows={6} />
            </Field>
            <Field label="Or link to the full policy">
              <TextInput value={policy.url} onChange={(v) => setGroup("policy", { url: v })} placeholder="https://…/policy.pdf" />
            </Field>
            <SettingsList>
              <SettingRow title="Must scroll to the end" checked={Boolean(policy.requireScroll)} onCheckedChange={(v) => setGroup("policy", { requireScroll: v })} />
              <SettingRow title="Type full name to acknowledge" checked={Boolean(policy.requireName)} onCheckedChange={(v) => setGroup("policy", { requireName: v })} />
            </SettingsList>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Duplicate detection" description="Spot repeat submissions that match on key fields.">
        <SettingsList>
          <SettingRow title="Detect duplicates" checked={Boolean(duplicates.enabled)} onCheckedChange={(v) => setGroup("duplicates", { enabled: v })} />
        </SettingsList>
        {duplicates.enabled ? (
          <div className="mt-4 grid gap-4">
            <Field label="Match on" hint="A response is a duplicate when all selected fields match an earlier one.">
              {pickable.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {pickable.map((f) => (
                    <label key={f.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface-card px-3 py-2 text-sm text-muted-foreground">
                      <Checkbox checked={(duplicates.fieldIds || []).includes(f.id)} onCheckedChange={(v) => toggleDupField(f.id, Boolean(v))} />
                      <span className="truncate">{f.label || f.title}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-tertiary">Add an email, name or text field in the builder to match on.</p>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Look back (days)">
                <NumberInput value={duplicates.windowDays} min={1} onChange={(v) => setGroup("duplicates", { windowDays: v })} />
              </Field>
              <Field label="When a duplicate arrives">
                <Select value={duplicates.action || "flag"} onValueChange={(v) => setGroup("duplicates", { action: v })}>
                  <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flag">Accept and flag it</SelectItem>
                    <SelectItem value="block">Block the submission</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </div>
        ) : null}
      </SectionCard>
    </Stack>
  );
}
