"use client";

import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { AddButton, ChipsInput, ItemCard, MergeTagHelp, Note, NumberInput, Stack, TextArea, TextInput, uid } from "./kit";

// Respondent confirmation, team alerts, drip follow-ups and weekly digests.
export function NotificationsSection({ form, settings, set }) {
  const followUps = settings.followUps || [];
  const updateFollowUp = (id, patch) => set("followUps", followUps.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const addFollowUp = () => set("followUps", [...followUps, { id: uid("fu"), delayHours: 24, subject: "Following up on your submission", body: "" }]);
  const hasEmailField = (form.fieldDefs || []).some((f) => f.type === "email");

  return (
    <Stack>
      <SectionCard title="Confirmation email" description="Sent to the respondent right after they submit.">
        <SettingsList>
          <SettingRow title="Email respondents a confirmation" checked={Boolean(settings.confirmEmail)} onCheckedChange={(v) => set("confirmEmail", v)} />
        </SettingsList>
        {settings.confirmEmail ? (
          <div className="mt-4 grid gap-4">
            {!hasEmailField ? <Note tone="warning">Add an Email field in the builder — confirmations go to the first email answer.</Note> : null}
            <Field label="Subject">
              <TextInput value={settings.confirmSubject} onChange={(v) => set("confirmSubject", v)} />
            </Field>
            <Field label="Body">
              <TextArea value={settings.confirmBody} onChange={(v) => set("confirmBody", v)} rows={5} />
            </Field>
            <MergeTagHelp fields={form.fieldDefs} />
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Team notifications">
        <div className="grid gap-4">
          <Field label="Email these people on every new response">
            <ChipsInput value={settings.notifyEmails || []} onChange={(v) => set("notifyEmails", v)} placeholder="ops@company.com" />
          </Field>
          <SettingsList>
            <SettingRow title="Notify in Geiger Flow" description="Post new responses to the project's Flow activity." checked={Boolean(settings.notifyFlow)} onCheckedChange={(v) => set("notifyFlow", v)} />
          </SettingsList>
          <Field label="Weekly report" hint="A digest of responses, completion and items needing review, sent Mondays (UTC).">
            <ChipsInput value={settings.reportEmails || []} onChange={(v) => set("reportEmails", v)} placeholder="lead@company.com" />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Follow-up emails" description="Drip emails sent to the respondent after they submit." action={<AddButton onClick={addFollowUp}>Add follow-up</AddButton>}>
        {followUps.length ? (
          <div className="space-y-3">
            {followUps.map((f, i) => (
              <ItemCard key={f.id} onRemove={() => set("followUps", followUps.filter((x) => x.id !== f.id))} removeLabel="Remove follow-up">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">Follow-up {i + 1}</p>
                <div className="grid gap-3 pr-6">
                  <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                    <Field label="Send after (hours)">
                      <NumberInput value={f.delayHours} min={1} onChange={(v) => updateFollowUp(f.id, { delayHours: v })} />
                    </Field>
                    <Field label="Subject">
                      <TextInput value={f.subject} onChange={(v) => updateFollowUp(f.id, { subject: v })} />
                    </Field>
                  </div>
                  <Field label="Body">
                    <TextArea value={f.body} onChange={(v) => updateFollowUp(f.id, { body: v })} rows={3} placeholder="Hi {Full name}, …" />
                  </Field>
                </div>
              </ItemCard>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No follow-ups scheduled.</p>
        )}
      </SectionCard>
    </Stack>
  );
}
