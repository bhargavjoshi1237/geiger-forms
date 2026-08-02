"use client";

import { Sparkles } from "lucide-react";
import { FormsScreenShell, EmptyState } from "@/components/internal/screens/forms/screen-shell";
import { navItemById } from "@/components/internal/sidebar/sidebar_nav";

// Placeholder for feature-catalog views that aren't built yet. Keeps every
// sidebar item navigable and on-brand instead of dead-ending on the Forms list.
export function ComingSoonScreen({ view }) {
  const item = navItemById(view);
  const title = item?.title ?? "Coming soon";
  const eyebrow = item?.group ?? "Roadmap";

  return (
    <FormsScreenShell
      eyebrow={eyebrow}
      title={title}
      description="This capability is on the Geiger Forms roadmap. It's mapped in the feature catalog and will land here."
    >
      <EmptyState
        Icon={Sparkles}
        title={`${title} — coming soon`}
        description="Planned surface from the competitive feature catalog. Wire a screen to this view id to replace this placeholder."
      />
    </FormsScreenShell>
  );
}

export default ComingSoonScreen;
