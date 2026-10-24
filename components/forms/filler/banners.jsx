"use client";

import { AlertTriangle, CheckCircle2, Info, PencilLine, WifiOff } from "lucide-react";
import { Checkbox } from "@geiger/ui/checkbox";
import { cn } from "@/lib/utils";

const TONES = {
  info: { className: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300", Icon: Info },
  success: { className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Icon: CheckCircle2 },
  warning: { className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300", Icon: AlertTriangle },
  danger: { className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300", Icon: AlertTriangle },
  offline: { className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300", Icon: WifiOff },
  edit: { className: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300", Icon: PencilLine },
};

// Inline status banner (edit mode, offline, restored draft, submit errors).
export function Banner({ tone = "info", icon, title, children, actions, className, role = "status" }) {
  const t = TONES[tone] || TONES.info;
  const Icon = icon || t.Icon;
  return (
    <div role={role} className={cn("flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center", t.className, className)}>
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 sm:ml-2">{actions}</div>}
    </div>
  );
}

// Opt-in for saving unfinished answers on the server, shown when the form requires consent first.
export function ConsentNotice({ checked, onChange, tr }) {
  return (
    <label htmlFor="gf-partial-consent" className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-card px-4 py-3 text-sm">
      <Checkbox id="gf-partial-consent" checked={checked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" />
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{tr("partialConsent")}</span>
        <span className="mt-0.5 block text-xs leading-5 text-text-secondary">{tr("partialConsentHint")}</span>
      </span>
    </label>
  );
}
