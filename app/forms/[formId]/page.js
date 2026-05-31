import { FormBuilderShell } from "@/components/forms/form-builder-shell";
import { titleFromSlug } from "@/lib/forms/schema";

export async function generateMetadata({ params }) {
  const { formId } = await params;
  return { title: `${titleFromSlug(formId)} — Form Builder · Geiger Forms` };
}

export default async function FormPage({ params }) {
  const { formId } = await params;

  return <FormBuilderShell formId={formId} title={titleFromSlug(formId)} />;
}
