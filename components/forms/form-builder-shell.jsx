"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FormBuilder, FormBuilderTopbarActions } from "@/components/forms/form-builder";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { withPrefix } from "@/lib/workspace/base-path";

export function FormBuilderShell({ formId, title }) {
  const router = useRouter();
  const { projectId, setView } = useWorkspaceUrl();

  return (
    <AppShell
      activeView="Forms"
      onViewChange={(view) => {
        if (projectId) setView(view);
        else router.push(withPrefix(`/forms?view=${view}`));
      }}
      contentClassName="p-0 md:p-0"
      topbarTitle={title}
      topbarActionsBeforeSearch={<FormBuilderTopbarActions formId={formId} />}
    >
      <FormBuilder formId={formId} />
    </AppShell>
  );
}
