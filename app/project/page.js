"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ProjectProvider,
  useProject,
  pickDefaultProjectId,
} from "@/context/project-context";
import { withPrefix } from "@/lib/workspace/base-path";
import { LoadingScreen } from "@geiger/ui/screen-kit";
import { NoProjectState } from "@/components/internal/screens/forms/no_project";

function ProjectResolver() {
  const router = useRouter();
  const { projects, loading } = useProject();

  useEffect(() => {
    if (loading || projects.length === 0) return;
    const id = pickDefaultProjectId(projects);
    if (id) router.replace(withPrefix(`/project/${id}`));
  }, [loading, projects, router]);

  if (!loading && projects.length === 0) return <NoProjectState />;
  return <LoadingScreen className="bg-background" label="Loading workspace" />;
}

export default function ProjectIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-background" />
      }
    >
      <ProjectProvider>
        <div className="h-[100dvh] w-full bg-background text-foreground">
          <ProjectResolver />
        </div>
      </ProjectProvider>
    </Suspense>
  );
}
