"use client";

import React, { Suspense } from "react";
import { ProjectProvider } from "@/context/project-context";

export default function ProjectWorkspaceLayout({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] w-full items-center justify-center bg-background" />
      }
    >
      <ProjectProvider>{children}</ProjectProvider>
    </Suspense>
  );
}
