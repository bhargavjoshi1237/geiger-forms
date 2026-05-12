import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1 text-sm text-[#ededed] transition-colors placeholder:text-[#737373] focus:border-[#474747] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
