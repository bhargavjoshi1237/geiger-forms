"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsScreen } from "@/components/internal/screens/forms/analytics/analytics_screen";
import { OverviewScreen } from "@/components/internal/screens/forms/overview/overview_screen";
import { FoldersScreen } from "@/components/internal/screens/forms/folders/folders_screen";
import { FormsScreen } from "@/components/internal/screens/forms/forms/forms_screen";
import { ResponsesScreen } from "@/components/internal/screens/forms/responses/responses_screen";
import { SettingsScreen } from "@/components/internal/screens/forms/settings/settings_screen";
import { SharedScreen } from "@/components/internal/screens/forms/shared/shared_screen";
import { TemplatesScreen } from "@/components/internal/screens/forms/templates/templates_screen";
import { ArchivedScreen } from "@/components/internal/screens/forms/archived/archived_screen";

function renderActiveScreen(activeView) {
  switch (activeView) {
    case "Overview":
      return <OverviewScreen />;
    case "Responses":
      return <ResponsesScreen />;
    case "Analytics":
      return <AnalyticsScreen />;
    case "Templates":
      return <TemplatesScreen />;
    case "Folders":
      return <FoldersScreen />;
    case "Shared":
      return <SharedScreen />;
    case "Archived":
      return <ArchivedScreen />;
    case "Settings":
      return <SettingsScreen />;
    case "Forms":
    default:
      return <FormsScreen />;
  }
}

const VALID_VIEWS = ["Overview", "Forms", "Responses", "Analytics", "Templates", "Folders", "Shared", "Archived", "Settings"];

export function FormsWorkspace({ playground = false }) {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const initialView = VALID_VIEWS.includes(requestedView) ? requestedView : "Forms";
  const [activeView, setActiveView] = useState(initialView);

  return (
    <AppShell
      activeView={activeView}
      onViewChange={setActiveView}
      className={playground ? "h-full" : undefined}
      contentClassName={playground ? "p-3 md:p-5" : undefined}
    >
      {renderActiveScreen(activeView)}
    </AppShell>
  );
}
