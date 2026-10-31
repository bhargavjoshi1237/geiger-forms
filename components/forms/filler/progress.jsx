"use client";

import { cn } from "@/lib/utils";

// Percent shown at step `index` of `total`: fast-then-slow (cuts drop-off per Villar et al. 2013), current step half done, 100% only once complete.
export function stepProgress(index, total) {
  const done = total > 0 ? Math.min(1, Math.max(0, (index + 0.5) / total)) : 0;
  return Math.floor((1 - (1 - done) ** 2) * 100);
}

const FILL = "h-full rounded-full [background:linear-gradient(90deg,var(--primary),var(--gf-accent2,var(--primary)))] transition-[width] duration-500 ease-out";

// Thin continuous progress bar for step `index` of `total`.
export function LinearProgress({ index, total, label, className }) {
  const pct = stepProgress(index, total);
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-surface-active", className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={label}>
      <div className={FILL} style={{ width: `${pct}%` }} />
    </div>
  );
}

// Page progress (classic layout): current page title, "Step x of y" and the bar.
export function PageProgress({ pages, index, tr }) {
  const step = tr("stepOf", { current: index + 1, total: pages.length });
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        {pages[index]?.title ? <h2 className="min-w-0 break-words text-xs font-medium text-foreground [font-family:inherit]">{pages[index].title}</h2> : <span className="min-w-0 break-words font-medium text-foreground">{step}</span>}
        <span className="shrink-0 tabular-nums text-text-tertiary">{step}</span>
      </div>
      <LinearProgress index={index} total={pages.length} label={step} className="h-1.5" />
    </div>
  );
}

// Beyond this many pages the titles won't fit under their segments, so only the numbers show.
const MAX_TITLED_STEPS = 4;

// One segment per page with its number and title; the current page shows half filled.
export function StepsProgress({ pages, index, tr }) {
  const step = tr("stepOf", { current: index + 1, total: pages.length });
  const current = pages[index]?.title;
  return (
    <div data-gf-part="progress" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }} role="progressbar" aria-label={step} aria-valuemin={0} aria-valuemax={100} aria-valuenow={stepProgress(index, pages.length)} aria-valuetext={current ? `${step}: ${current}` : step}>
      {pages.map((page, i) => (
        <div key={page.id} className="grid min-w-0 gap-2">
          <div className="h-1 overflow-hidden rounded-full bg-surface-active">
            <div className={FILL} style={{ width: i < index ? "100%" : i === index ? "50%" : "0%" }} />
          </div>
          <span className={cn("flex min-w-0 items-center gap-1.5 text-xs font-semibold", i <= index ? "text-foreground" : "text-text-tertiary")}>
            <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
            {page.title && pages.length <= MAX_TITLED_STEPS ? <span className="min-w-0 truncate">{page.title}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
