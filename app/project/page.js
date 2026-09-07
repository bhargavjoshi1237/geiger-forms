"use client";

import React, { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ProjectProvider,
  useProject,
  pickDefaultProjectId,
} from "@/context/project-context";
import { LoadingState } from "@/components/internal/screens/forms/screen-shell";
import { withPrefix } from "@/lib/workspace/base-path";

function ProjectResolver() {
  const router = useRouter();
  const { projects, loading } = useProject();

  useEffect(() => {
    if (loading) return;
    // Forms has no standalone login page — fall back to the unscoped
    // workspace when the user holds no project.
    if (projects.length === 0) {
      router.replace(withPrefix("/forms"));
      return;
    }
    const id = pickDefaultProjectId(projects);
    if (id) router.replace(withPrefix(`/project/${id}`));
  }, [loading, projects, router]);

  return <LoadingState label="Loading workspace…" />;
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
