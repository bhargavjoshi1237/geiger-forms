import { FormBuilderShell } from "@/components/forms/form-builder-shell";

function titleFromSlug(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function generateMetadata({ params }) {
  const { formId } = await params;
  return { title: `${titleFromSlug(formId)} — Form Builder · Geiger Forms` };
}

export default async function FormPage({ params }) {
  const { formId } = await params;

  return <FormBuilderShell formId={formId} title={titleFromSlug(formId)} />;
}
