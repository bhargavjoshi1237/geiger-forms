"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FormBuilder } from "@/components/forms/form-builder";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { withPrefix } from "@/lib/workspace/base-path";
import { DEFAULT_VIEW, viewToSlug } from "@/lib/workspace/views";

// Workspace URL for a view, scoped to the form's project when it has one.
function viewHref(projectId, view, query = "") {
  if (!projectId) return withPrefix(`/forms?view=${encodeURIComponent(view)}${query ? `&${query}` : ""}`);
  const slug = view && view !== DEFAULT_VIEW ? `/${viewToSlug(view)}` : "";
  return withPrefix(`/project/${projectId}${slug}${query ? `?${query}` : ""}`);
}

export function FormBuilderShell({ formId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectId: routeProjectId } = useWorkspaceUrl();
  const [formProjectId, setFormProjectId] = useState(null);
  const projectId = routeProjectId || formProjectId || searchParams.get("project") || null;

  const onLoaded = useCallback((form) => setFormProjectId(form.projectId || null), []);

  return (
    <AppShell
      activeView="Forms"
      onViewChange={(view) => router.push(viewHref(projectId, view))}
      contentClassName="p-0 md:p-0"
    >
      <FormBuilder
        formId={formId}
        projectId={projectId}
        backHref={viewHref(projectId, "Forms")}
        onLoaded={onLoaded}
      />
    </AppShell>
  );
}
