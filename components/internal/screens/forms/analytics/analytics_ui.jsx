"use client";

import { CalendarRange, FileText } from "lucide-react";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { RANGE_OPTIONS } from "./analytics_data";
import { cn } from "@/lib/utils";

// Small shared controls for the analytics screens.

export function RangePicker({ value, onChange }) {
  return <FilterDropdown value={value} onValueChange={onChange} options={RANGE_OPTIONS} icon={CalendarRange} height="h-9" />;
}

export function FormPicker({ forms, value, onChange, allowAll = false, allLabel = "All forms" }) {
  const options = [
    ...(allowAll ? [{ value: "all", label: allLabel }] : []),
    ...forms.map((f) => ({ value: f.id, label: f.name || f.title || "Untitled form" })),
  ];
  if (!options.length) return null;
  return <FilterDropdown value={value} onValueChange={onChange} options={options} icon={FileText} height="h-9" />;
}

// Horizontal meter used by funnels and drop-off tables.
export function Meter({ value, className, barClassName = "bg-foreground/80" }) {
  const width = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-surface-active", className)}>
      <div className={cn("h-1.5 rounded-full transition-all", barClassName)} style={{ width: `${width}%` }} />
    </div>
  );
}

// One funnel stage: label, count, and share of the first stage.
export function FunnelStep({ label, count, share, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-sm text-foreground">
          {count.toLocaleString()}
          <span className="ml-2 text-xs text-text-tertiary">{share == null ? "—" : `${share}%`}</span>
        </span>
      </div>
      <Meter value={share ?? 0} className="h-2" barClassName="h-2 bg-foreground/80" />
      {hint ? <p className="text-[11px] text-text-tertiary">{hint}</p> : null}
    </div>
  );
}
