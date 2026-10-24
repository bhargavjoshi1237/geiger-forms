"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormsWorkspace } from "@/components/forms/forms-workspace";
import { useProject, pickDefaultProjectId } from "@/context/project-context";
import { withPrefix } from "@/lib/workspace/base-path";
import { LoadingScreen } from "@geiger/ui/screen-kit";
import { NoProjectState } from "@/components/internal/screens/forms/no_project";

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const { project, projects, loading } = useProject();

  useEffect(() => {
    if (loading || project || projects.length === 0) return;
    const fallback = pickDefaultProjectId(projects);
    if (fallback) router.replace(withPrefix(`/project/${fallback}`));
  }, [loading, project, projects, router]);

  if (!loading && projects.length === 0) return <NoProjectState />;
  if (loading || !project) return <LoadingScreen className="bg-background" label="Loading workspace" />;

  return (
    <div key={project.id} className="h-full">
      <FormsWorkspace />
    </div>
  );
}
