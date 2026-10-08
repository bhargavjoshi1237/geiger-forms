"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Form editor sections: access/spam/privacy/retention, and sensitive data/HIPAA.
export const ACCESS_SECTION = "access";
export const COMPLIANCE_SECTION = "security";

export function OnOff({ on, label }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", on ? "text-emerald-400" : "text-text-tertiary")}>
      {on ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      {label ?? (on ? "On" : "Off")}
    </span>
  );
}

// Numbered checklist row used by the compliance screens.
export function ChecklistItem({ done, title, children }) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          done ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-border bg-surface-card text-text-tertiary",
        )}
      >
        {done ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-5 text-text-secondary">{children}</p>
      </div>
    </li>
  );
}
