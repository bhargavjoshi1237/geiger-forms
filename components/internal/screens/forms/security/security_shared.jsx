"use client";

import { Check, CircleDashed, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// Form editor sections: access/spam/privacy/retention, and sensitive data/HIPAA.
export const ACCESS_SECTION = "access";
export const COMPLIANCE_SECTION = "security";

export function OnOff({ on, label }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", on ? "text-emerald-600 dark:text-emerald-400" : "text-text-tertiary")}>
      {on ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      {label ?? (on ? "On" : "Off")}
    </span>
  );
}

// Numbered checklist row used by the compliance screens; `done={null}` means it couldn't be checked and needs verifying.
export function ChecklistItem({ done, title, children }) {
  const Icon = done ? Check : done === null ? CircleDashed : Minus;
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          done
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : done === null
              ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              : "border-border bg-surface-card text-text-tertiary",
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-5 text-text-secondary">{children}</p>
      </div>
    </li>
  );
}
