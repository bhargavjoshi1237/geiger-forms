"use client";

import { Sparkles } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { EmptyState, ScreenHeader, SectionCard } from "@geiger/ui/screen-kit";
import { navItemById } from "@/components/internal/sidebar/sidebar_nav";

// What each AI surface will do once the suite's shared @geiger/ai package lands.
const AI_PLANS = {
  "ai.generate": "Describe a form in plain language and get a ready-to-edit draft with fields, logic, and validation.",
  "ai.analysis": "Summaries, themes, and sentiment across free-text answers, right inside the form's report.",
  "ai.assist": "Help respondents phrase long answers and fill structured fields from pasted text.",
  "ai.moderation": "Flag abusive, spammy, or off-topic free-text answers before they reach your inbox.",
};

// Placeholder for the AI group, which ships with the suite-wide @geiger/ai package rather than in this app.
export function ComingSoonScreen({ view }) {
  const item = navItemById(view);
  const title = item?.title ?? "Coming soon";
  const plan = AI_PLANS[view];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title={title}
        description={`${item?.group ?? "Roadmap"} · Arriving with Geiger's shared AI layer.`}
        actions={<Badge variant="purple">Coming soon</Badge>}
      />

      <div className="rounded-xl border border-border bg-surface-subtle">
        <EmptyState
          icon={Sparkles}
          title={`${title} is coming soon`}
          description={plan || "This capability is on the Geiger Forms roadmap."}
        />
      </div>

      <SectionCard title="Why it isn't here yet">
        <p className="text-sm text-text-secondary">
          AI features across the Geiger suite are delivered by one shared package, <code className="rounded bg-surface-card px-1 text-xs">@geiger/ai</code>, so every app gets the same models, privacy controls, and usage limits. Geiger Forms will switch these on as soon as that package is available — no extra setup on your side.
        </p>
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default ComingSoonScreen;
