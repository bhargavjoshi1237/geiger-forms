"use client";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { MergeTagHelp, OUTLINE_BTN, Stack, TextArea, TextInput } from "./kit";

// Welcome screen before the first question, the thank-you screen after submit and the per-outcome endings.
export function ScreensSection({ form, settings, set, setGroup, openBuilder }) {
  const welcome = settings.welcome || {};
  const redirect = settings.thankYouType === "redirect";
  const branches = settings.branchingEnabled ? settings.branches || [] : [];
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
            <Field label="Body" hint="Merge tags recall hidden fields from the link, e.g. Hi {Name}.">
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

      {branches.length ? (
        <SectionCard
          title="Outcome endings"
          description="A named outcome can replace the screen above with its own ending, button and redirect — set it on its branch in the builder."
          action={<Button type="button" size="sm" variant="outline" onClick={openBuilder} className={OUTLINE_BTN}>Open builder</Button>}
        >
          <ul className="divide-y divide-border">
            {branches.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{b.outcome || b.name || "Untitled outcome"}</p>
                  {b.ending?.enabled ? <p className="truncate text-[11px] text-text-tertiary">{b.ending.title || settings.thankYouTitle}</p> : null}
                </div>
                <Badge variant={b.ending?.enabled ? "purple" : "neutral"}>{b.ending?.enabled ? (b.ending.redirectUrl ? "Redirects" : "Own ending") : "Default ending"}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}
    </Stack>
  );
}
