"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, PencilLine, WifiOff } from "lucide-react";
import { Checkbox } from "@geiger/ui/checkbox";
import { cn } from "@/lib/utils";
import { scrollMotion } from "@/lib/forms/a11y";

const TONES = {
  info: { className: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300", Icon: Info },
  success: { className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", Icon: CheckCircle2 },
  warning: { className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300", Icon: AlertTriangle },
  danger: { className: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300", Icon: AlertTriangle },
  offline: { className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300", Icon: WifiOff },
  edit: { className: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300", Icon: PencilLine },
};

// Latest screen reader message; the counter makes a repeated message count as a change.
export function useAnnouncer() {
  const [message, setMessage] = useState({ text: "", n: 0 });
  const announce = useCallback((text) => setMessage((cur) => ({ text: text || "", n: cur.n + 1 })), []);
  return [message, announce];
}

// Always-mounted polite live region; a region inserted along with its text often goes unread.
export function LiveRegion({ message }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message.text}
      {message.n % 2 ? "\u00a0" : ""}
    </div>
  );
}

// Lists every invalid field with a link to it, and takes focus each time a submit or Next attempt fails.
export function ErrorSummary({ items, title, focusKey, onPick }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!focusKey || !ref.current) return;
    ref.current.focus({ preventScroll: true });
    ref.current.scrollIntoView({ behavior: scrollMotion(), block: "center" });
  }, [focusKey]);
  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 outline-none dark:text-red-300">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 grid gap-0.5">
        {items.map((item) => (
          <li key={item.key}>
            <a
              href={`#${item.targetId || `gf-${item.fieldId}`}`}
              onClick={(e) => {
                e.preventDefault();
                onPick(item);
              }}
              className="inline-block min-h-6 py-0.5 underline underline-offset-4"
            >
              {item.label}: <span lang={item.lang}>{item.message}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Inline banner (edit mode, offline, restored draft, submit errors); changes are spoken by the runner's live region, so only errors pass a role.
export function Banner({ tone = "info", icon, title, children, actions, className, role }) {
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
