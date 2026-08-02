import { Suspense } from "react";
import { FormFillerContent } from "@/components/forms/form-filler-content";

export const metadata = {
  title: "Form - Geiger Studio",
  description: "Fill out this form.",
};

// The [formId] route segment carries the form slug (getPublishedFormBySlug resolves it).
export default async function FormFillerPage({ params }) {
  const { formId } = await params;
  return (
    <Suspense>
      <FormFillerContent formId={formId} />
    </Suspense>
  );
}
