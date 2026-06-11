"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function FileInput({ className, ...props }) {
  return (
    <input
      type="file"
      data-slot="file-input"
      className={cn(
        "block w-full cursor-pointer rounded-md border border-dashed border-border bg-background px-3 py-3 text-xs text-muted-foreground transition-colors file:mr-3 file:rounded file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-xs file:text-muted-foreground hover:border-border-strong focus:border-border-strong focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { FileInput };
