"use client";

import { cn } from "@/lib/utils";

// Segmented page progress with step titles (titles collapse to "Step x of y" on small screens).
export function PageProgress({ pages, index, tr }) {
  const total = pages.length;
  return (
    <nav aria-label={tr("stepOf", { current: index + 1, total })} className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate font-medium text-foreground">{pages[index]?.title || tr("stepOf", { current: index + 1, total })}</span>
        <span className="shrink-0 tabular-nums text-text-tertiary">{tr("stepOf", { current: index + 1, total })}</span>
      </div>
      <ol className="flex gap-1.5">
        {pages.map((page, i) => (
          <li key={page.id} className="min-w-0 flex-1" aria-current={i === index ? "step" : undefined}>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-active">
              <div className={cn("h-full rounded-full bg-primary transition-[width] duration-500 ease-out", i < index ? "w-full" : i === index ? "w-1/2" : "w-0")} />
            </div>
            {total <= 6 && (
              <span className={cn("mt-1.5 hidden truncate text-[11px] sm:block", i === index ? "text-foreground" : "text-text-tertiary")}>
                {page.title || tr("stepOf", { current: i + 1, total })}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

// Thin continuous bar (conversational layout).
export function LinearProgress({ value, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-surface-active" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
