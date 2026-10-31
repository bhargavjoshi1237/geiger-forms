"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@geiger/ui/button";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { callApi } from "@/lib/forms/api";
import { CONTACT_COLUMNS } from "@/lib/forms/suite-records";
import { cn } from "@/lib/utils";
import { ChipsInput, CopyField, FIELD_CLS, Note, Stack, TextInput, inputFields } from "./kit";

const NONE = "__none";

function FieldSelect({ label, value, fields, onChange }) {
  return (
    <Field label={label}>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger className={cn("h-9", FIELD_CLS)} aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not mapped</SelectItem>
          {fields.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.label || f.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function RecordLink({ formId }) {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const { ok, data } = await callApi(`/api/forms/${formId}/record-link`, { method: "POST", body: { email } });
    setBusy(false);
    if (!ok) return toast.error(data?.error || "Couldn't create the link.");
    setUrl(data.url);
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextInput value={email} onChange={setEmail} placeholder="contact@company.com" aria-label="Contact email" className="sm:max-w-xs" />
        <Button type="button" variant="outline" disabled={busy || !email.trim()} onClick={create}>
          {busy ? <Loader2 className="animate-spin" /> : <Link2 />}
          Create link
        </Button>
      </div>
      {url ? <CopyField value={url} label="Link copied" /> : null}
    </div>
  );
}

// Writes each submission to the project's Events contacts, next to the Flow issue escalation already in Workflow.
export function SuiteRecordsSection({ form, settings, setGroup }) {
  const sync = settings.contactSync || {};
  const map = sync.map || {};
  // Encrypted answers can't leave Forms in plaintext, so they aren't offered.
  const fields = inputFields(form.fieldDefs).filter((f) => !f.sensitive);
  const consentFields = fields.filter((f) => f.type === "consent" || f.type === "checkbox");
  return (
    <Stack>
      <SectionCard title="Events contacts" description="Creates or updates a contact in this project's Geiger Events contact book on every new response, matched by email.">
        <SettingsList>
          <SettingRow title="Sync responses to contacts" checked={Boolean(sync.enabled)} disabled={!form.projectId} onCheckedChange={(v) => setGroup("contactSync", { enabled: v })} />
        </SettingsList>
        {!form.projectId ? <Note className="mt-4">This form isn&apos;t in a project, so there&apos;s no contact book to sync to.</Note> : null}
        {sync.enabled ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {CONTACT_COLUMNS.map(({ key, label }) => (
                <FieldSelect key={key} label={label} value={map[key]} fields={fields} onChange={(id) => setGroup("contactSync", { map: { ...map, [key]: id } })} />
              ))}
            </div>
            <FieldSelect label="Marketing consent" value={sync.consentFieldId} fields={consentFields} onChange={(consentFieldId) => setGroup("contactSync", { consentFieldId })} />
            <Field label="Add tags" hint="Added to the contact's existing tags.">
              <ChipsInput value={sync.tags || []} onChange={(tags) => setGroup("contactSync", { tags })} placeholder="webinar-2026" validate={() => true} />
            </Field>
            <Note>Because anyone can type any email into a public form, a response matched by email only fills a contact&apos;s blank details and adds tags. Overwriting details or granting consent on an existing contact takes the personal link below. Blocked contacts aren&apos;t changed, sensitive questions can&apos;t be mapped, and edits to a response aren&apos;t synced.</Note>
          </div>
        ) : null}
      </SectionCard>
      {sync.enabled && form.projectId ? (
        <SectionCard title="Update an existing contact" description="A personal link prefills this form from one contact, and submitting it updates that contact. Anyone with the link can see the mapped details, so send it only to them. It expires after 30 days.">
          <RecordLink formId={form.id} />
        </SectionCard>
      ) : null}
    </Stack>
  );
}
