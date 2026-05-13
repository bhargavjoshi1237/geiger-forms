"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Switch({ checked, onCheckedChange, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full border transition-colors",
        checked ? "border-white bg-white" : "border-[#474747] bg-[#202020]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-[#a3a3a3] shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export { Switch };
