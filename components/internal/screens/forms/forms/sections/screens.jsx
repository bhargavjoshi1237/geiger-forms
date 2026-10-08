"use client";

import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { MergeTagHelp, Stack, TextArea, TextInput } from "./kit";

// Welcome screen before the first question and the thank-you screen after submit.
export function ScreensSection({ form, settings, set, setGroup }) {
  const welcome = settings.welcome || {};
  const redirect = settings.thankYouType === "redirect";
  return (
    <Stack>
      <SectionCard title="Welcome screen" description="An optional intro shown before the first question.">
        <SettingsList>
          <SettingRow title="Show a welcome screen" checked={Boolean(welcome.enabled)} onCheckedChange={(v) => setGroup("welcome", { enabled: v })} />
        </SettingsList>
        {welcome.enabled ? (
          <div className="mt-4 grid gap-4">
            <Field label="Title">
              <TextInput value={welcome.title} onChange={(v) => setGroup("welcome", { title: v })} placeholder={form.title} />
            </Field>
            <Field label="Body">
              <TextArea value={welcome.body} onChange={(v) => setGroup("welcome", { body: v })} rows={3} placeholder="It takes about 3 minutes." />
            </Field>
            <Field label="Button label">
              <TextInput value={welcome.buttonLabel} onChange={(v) => setGroup("welcome", { buttonLabel: v })} placeholder="Start" className="max-w-xs" />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="After submission" description="What respondents see once they submit.">
        <div className="grid gap-4">
          <Tabs value={redirect ? "redirect" : "message"} onValueChange={(v) => set("thankYouType", v)}>
            <TabsList>
              <TabsTrigger value="message">Thank-you message</TabsTrigger>
              <TabsTrigger value="redirect">Redirect to URL</TabsTrigger>
            </TabsList>
          </Tabs>
          {redirect ? (
            <Field label="Redirect URL" hint="Respondents are sent here after submitting. Merge tags work in the query string.">
              <TextInput value={settings.thankYouUrl} onChange={(v) => set("thankYouUrl", v)} placeholder="https://example.com/thanks?name={Full name}" />
            </Field>
          ) : (
            <>
              <Field label="Title">
                <TextInput value={settings.thankYouTitle} onChange={(v) => set("thankYouTitle", v)} />
              </Field>
              <Field label="Message">
                <TextArea value={settings.thankYouText} onChange={(v) => set("thankYouText", v)} rows={4} />
              </Field>
            </>
          )}
          <MergeTagHelp fields={form.fieldDefs} />
        </div>
        <SettingsList className="mt-4 border-t border-border pt-4">
          <SettingRow title="Show score" description="Display the response score (or quiz result) on the thank-you screen." checked={Boolean(settings.showScore)} onCheckedChange={(v) => set("showScore", v)} />
          <SettingRow title="Allow another submission" description="Adds a “Submit another response” button." checked={Boolean(settings.submitAnother)} onCheckedChange={(v) => set("submitAnother", v)} />
        </SettingsList>
      </SectionCard>
    </Stack>
  );
}
