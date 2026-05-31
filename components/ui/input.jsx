import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        // h-9 (36px) minus the 1px top+bottom border = 34px content box.
        // Setting line-height to fill that box lets Geist's glyphs center vertically
        // instead of riding high inside an oversized text-sm line box.
        "h-9 w-full rounded-md border border-[#2a2a2a] bg-[#161616] px-3 text-sm/[2.125rem] text-white transition-colors placeholder:text-[#737373] focus:border-[#474747] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
