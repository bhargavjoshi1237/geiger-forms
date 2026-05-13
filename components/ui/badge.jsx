import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-[#333333] bg-[#202020] px-2 py-0.5 text-xs font-medium text-[#a3a3a3]",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
