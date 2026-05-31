"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function FileInput({ className, ...props }) {
  return (
    <input
      type="file"
      data-slot="file-input"
      className={cn(
        "block w-full cursor-pointer rounded-md border border-dashed border-[#2a2a2a] bg-[#161616] px-3 py-3 text-xs text-[#a3a3a3] transition-colors file:mr-3 file:rounded file:border-0 file:bg-[#2a2a2a] file:px-3 file:py-1.5 file:text-xs file:text-[#d4d4d4] hover:border-[#474747] focus:border-[#474747] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { FileInput };
