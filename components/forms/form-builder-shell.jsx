"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { FormBuilder, FormBuilderTopbarActions } from "@/components/forms/form-builder";

export function FormBuilderShell({ formId, title }) {
  const router = useRouter();

  return (
    <AppShell
      activeView="Forms"
      onViewChange={(view) => router.push(`/forms?view=${view}`)}
      contentClassName="p-0 md:p-0"
      topbarTitle={title}
      topbarActionsBeforeSearch={<FormBuilderTopbarActions formId={formId} />}
    >
      <FormBuilder formId={formId} />
    </AppShell>
  );
}
