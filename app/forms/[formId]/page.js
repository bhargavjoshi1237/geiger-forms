import { Suspense } from "react";
import { FormBuilderShell } from "@/components/forms/form-builder-shell";
import { titleFromSlug } from "@/lib/forms/schema";

// The [formId] route segment carries the form slug (getFormBySlug resolves it).
export async function generateMetadata({ params }) {
  const { formId } = await params;
  const name = titleFromSlug(formId);
  return {
    title: name ? `${name} · Form Builder - Geiger Studio` : "Form Builder - Geiger Studio",
    description: "Design questions, pages, logic and scoring for your form.",
    robots: { index: false, follow: false },
  };
}

export default async function FormBuilderPage({ params }) {
  const { formId } = await params;
  return (
    <Suspense>
      <FormBuilderShell formId={formId} />
    </Suspense>
  );
}
