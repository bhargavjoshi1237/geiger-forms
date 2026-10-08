"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@geiger/ui/button";

// Shared error state for workspace screens; @geiger/ui has no equivalent (loading uses its LoadingArea/LoadingScreen).
export function ErrorState({ title = "Something went wrong", description, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-subtle px-6 py-16 text-center">
      <div className="mb-3 grid h-9 w-9 place-items-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-4 w-4 text-red-400" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
