import { FormFillerContent } from "@/components/forms/form-filler-content";

export async function generateMetadata({ params }) {
  const { formId } = await params;
  return {
    title: `${formId} - Geiger Forms`,
    description: "Fill out and submit a Geiger Form.",
  };
}

export default async function FormFillerPage({ params }) {
  const { formId } = await params;
  return <FormFillerContent formId={formId} />;
}
