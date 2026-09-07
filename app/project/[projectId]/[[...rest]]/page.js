"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormsWorkspace } from "@/components/forms/forms-workspace";
import { useProject, pickDefaultProjectId } from "@/context/project-context";
import { LoadingState } from "@/components/internal/screens/forms/screen-shell";
import { withPrefix } from "@/lib/workspace/base-path";

export default function ProjectWorkspacePage() {
  const router = useRouter();
  const { project, projects, loading } = useProject();

  useEffect(() => {
    if (loading) return;
    if (projects.length === 0) {
      router.replace(withPrefix("/forms"));
      return;
    }
    if (project) return;
    const fallback = pickDefaultProjectId(projects);
    if (fallback) router.replace(withPrefix(`/project/${fallback}`));
  }, [loading, project, projects, router]);

  if (loading) return <LoadingState label="Loading workspace…" />;
  if (projects.length === 0 || !project) return <LoadingState label="Loading workspace…" />;

  return (
    <div key={project.id} className="h-full">
      <FormsWorkspace />
    </div>
  );
}
