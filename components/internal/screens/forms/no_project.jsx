"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, FolderPlus } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { EmptyState } from "@geiger/ui/screen-kit";
import { listForms } from "@/lib/supabase/forms";
import { withPrefix } from "@/lib/workspace/base-path";
import { HUB_PROJECTS_URL } from "@/lib/workspace/hub";
import { Note } from "./forms/sections/kit";

// Shown in place of the workspace when the signed-in user holds no project; projects are created and joined on the hub.
export function NoProjectState() {
  const [hasEarlierForms, setHasEarlierForms] = useState(false);

  // Forms made before projects were required stay reachable on the unscoped /forms workspace.
  useEffect(() => {
    let alive = true;
    listForms({ projectId: null })
      .then((rows) => alive && setHasEarlierForms(rows.length > 0))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-background p-6 text-foreground">
      <EmptyState
        icon={FolderPlus}
        title="No projects yet"
        description="Forms live inside a project. Create one in Geiger, or ask a teammate to invite you to theirs."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {hasEarlierForms ? (
              <Button variant="ghost" asChild>
                <a href={withPrefix("/forms?view=Forms")}>Open earlier forms</a>
              </Button>
            ) : null}
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <a href={HUB_PROJECTS_URL}>
                Go to projects <ArrowUpRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        }
      />
    </div>
  );
}

// Inline explanation on unscoped workspaces (legacy /forms, the landing playground) where create actions are hidden.
export function NoProjectNote({ className }) {
  return (
    <Note className={className}>
      Outside a project you can keep working on existing forms, but creating anything new needs one.{" "}
      <a href={HUB_PROJECTS_URL} className="font-medium text-foreground underline underline-offset-4">
        Create or join a project in Geiger
      </a>
      .
    </Note>
  );
}
