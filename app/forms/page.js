import { Suspense } from "react";
import { FormsWorkspace } from "@/components/forms/forms-workspace";

export const metadata = {
  title: "Forms Workspace - Geiger Studio",
  description: "Manage forms, templates, responses, analytics, and settings in Geiger Forms.",
};

export default function FormsPage() {
  return (
    <Suspense>
      <FormsWorkspace />
    </Suspense>
  );
}
