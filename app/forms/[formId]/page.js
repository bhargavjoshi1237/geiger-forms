import { Suspense } from "react";
import { FormBuilderShell } from "@/components/forms/form-builder-shell";

export const metadata = {
  title: "Form Builder - Geiger Studio",
  description: "Design questions, layout, and logic for your form.",
};

// The [formId] route segment carries the form slug (getFormBySlug resolves it).
export default async function FormBuilderPage({ params }) {
  const { formId } = await params;
  return (
    <Suspense>
      <FormBuilderShell formId={formId} />
    </Suspense>
  );
}
