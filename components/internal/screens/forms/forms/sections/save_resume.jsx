"use client";

import { SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Stack } from "./kit";

// Partial saves: resume links by email, on-device drafts and the respondent opt-in for server-side capture.
export function SaveResumeSection({ settings, set }) {
  return (
    <Stack>
      <SectionCard title="Finish later">
        <SettingsList>
          <SettingRow
            title="Save & resume"
            description="Respondents can save progress and get a resume link by email. Partial answers appear under Partial / Abandoned."
            checked={Boolean(settings.saveResume)}
            onCheckedChange={(v) => set("saveResume", v)}
          />
          <SettingRow
            title="Offline drafts"
            description="Keep answers on the respondent's device so a refresh or lost connection never loses work."
            checked={settings.offline !== false}
            onCheckedChange={(v) => set("offline", v)}
          />
          <SettingRow
            title="Ask before saving progress"
            description="Unfinished answers are only stored on the server once the respondent opts in. Those who don't won't appear in Partial / Abandoned or drop-off reports."
            checked={Boolean(settings.partialConsent)}
            onCheckedChange={(v) => set("partialConsent", v)}
          />
        </SettingsList>
      </SectionCard>
    </Stack>
  );
}
