"use client";

import { cn } from "@/lib/utils";

// Percent shown at step `index` of `total`: fast-then-slow (cuts drop-off per Villar et al. 2013), current step half done, 100% only once complete.
export function stepProgress(index, total) {
  const done = total > 0 ? Math.min(1, Math.max(0, (index + 0.5) / total)) : 0;
  return Math.floor((1 - (1 - done) ** 2) * 100);
}

// Thin continuous progress bar for step `index` of `total`.
export function LinearProgress({ index, total, label, className }) {
  const pct = stepProgress(index, total);
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-active", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Page progress (classic layout): current page title, "Step x of y" and the bar.
export function PageProgress({ pages, index, tr }) {
  const step = tr("stepOf", { current: index + 1, total: pages.length });
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-medium text-foreground">{pages[index]?.title || step}</span>
        <span className="shrink-0 tabular-nums text-text-tertiary">{step}</span>
      </div>
      <LinearProgress index={index} total={pages.length} label={step} className="h-1.5" />
    </div>
  );
}
