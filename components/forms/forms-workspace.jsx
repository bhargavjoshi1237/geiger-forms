"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { AnalyticsScreen } from "@/components/internal/screens/forms/analytics/analytics_screen";
import { OverviewScreen } from "@/components/internal/screens/forms/overview/overview_screen";
import { FoldersScreen } from "@/components/internal/screens/forms/folders/folders_screen";
import { FormsScreen } from "@/components/internal/screens/forms/forms/forms_screen";
import { ResponsesScreen } from "@/components/internal/screens/forms/responses/responses_screen";
import { SettingsScreen } from "@/components/internal/screens/forms/settings/settings_screen";
import { SharedScreen } from "@/components/internal/screens/forms/shared/shared_screen";
import { TemplatesScreen } from "@/components/internal/screens/forms/templates/templates_screen";
import { ArchivedScreen } from "@/components/internal/screens/forms/archived/archived_screen";
import { ComingSoonScreen } from "@/components/internal/screens/forms/coming-soon/coming_soon_screen";
import { DropoffScreen } from "@/components/internal/screens/forms/analytics/dropoff_screen";
import { AttributionScreen } from "@/components/internal/screens/forms/analytics/attribution_screen";
import { AbTestScreen } from "@/components/internal/screens/forms/analytics/abtest_screen";
import { ReportsScreen } from "@/components/internal/screens/forms/analytics/reports_screen";
import { PartialsScreen } from "@/components/internal/screens/forms/partials/partials_screen";
import { RetentionScreen } from "@/components/internal/screens/forms/security/retention_screen";
import { SpamScreen } from "@/components/internal/screens/forms/security/spam_screen";
import { HipaaScreen } from "@/components/internal/screens/forms/security/hipaa_screen";
import { ActivityScreen } from "@/components/internal/screens/forms/activity/activity_screen";
import { CommentsScreen } from "@/components/internal/screens/forms/comments/comments_screen";
import { RolesScreen } from "@/components/internal/screens/forms/roles/roles_screen";
import { DeveloperScreen } from "@/components/internal/screens/forms/developer/developer_screen";
import { FeatureHubScreen } from "@/components/internal/screens/forms/catalog/feature_hub_screen";
import { featureFor } from "@/components/internal/screens/forms/catalog/feature_map";
import { navItemById } from "@/components/internal/sidebar/sidebar_nav";

// Catalog views that open the developer hub on a specific tab.
const DEVELOPER_VIEWS = new Set(["dev.hooks", "dev.headless", "dev.frontend", "integ.api", "integ.webhooks"]);

// Views sharing one component are keyed by id so switching between them resets their state.
function renderActiveScreen(activeView) {
  switch (activeView) {
    case "Overview":
      return <OverviewScreen />;
    case "Responses":
      return <ResponsesScreen />;
    case "responses.tables":
      return <ResponsesScreen key={activeView} initialLayout="table" />;
    case "responses.bulk":
      return <ResponsesScreen key={activeView} focus="bulk" />;
    case "responses.export":
      return <ResponsesScreen key={activeView} focus="export" />;
    case "responses.partial":
      return <PartialsScreen />;
    case "responses.retention":
    case "security.gdpr":
      return <RetentionScreen key={activeView} focus={activeView === "security.gdpr" ? "gdpr" : "retention"} />;
    case "Analytics":
      return <AnalyticsScreen />;
    case "analytics.dropoff":
      return <DropoffScreen />;
    case "analytics.attribution":
      return <AttributionScreen />;
    case "analytics.abtest":
      return <AbTestScreen />;
    case "analytics.reports":
    case "survey.reporting":
      return <ReportsScreen key={activeView} survey={activeView === "survey.reporting"} />;
    case "collab.activity":
      return <ActivityScreen />;
    case "collab.comments":
      return <CommentsScreen />;
    case "collab.roles":
    case "security.access":
      return <RolesScreen key={activeView} focus={activeView === "security.access" ? "access" : "roles"} />;
    case "security.spam":
      return <SpamScreen />;
    case "security.hipaa":
      return <HipaaScreen />;
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
      return <FormsScreen />;
    default:
      if (DEVELOPER_VIEWS.has(activeView)) return <DeveloperScreen key={activeView} view={activeView} />;
      if (featureFor(activeView)) return <FeatureHubScreen key={activeView} view={activeView} />;
      // Only the AI views (shipping with @geiger/ai) reach the roadmap placeholder.
      return <ComingSoonScreen view={activeView} />;
  }
}

export function FormsWorkspace({ playground = false }) {
  const searchParams = useSearchParams();
  const { projectId, view: routeView, setView } = useWorkspaceUrl();
  const requestedView = searchParams.get("view");
  const initialView = navItemById(requestedView) ? requestedView : "Overview";
  const [legacyView, setLegacyView] = useState(initialView);

  // Under /project/<id> the view lives in the URL path (hub-compatible);
  // the legacy /forms entry point keeps its ?view= state.
  const activeView = projectId ? routeView : legacyView;
  const handleViewChange = projectId ? setView : setLegacyView;

  return (
    <AppShell
      activeView={activeView}
      onViewChange={handleViewChange}
      className={playground ? "h-full" : undefined}
      contentClassName={playground ? "p-3 md:p-5" : undefined}
    >
      {renderActiveScreen(activeView)}
    </AppShell>
  );
}
