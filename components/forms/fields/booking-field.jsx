"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CalendarCheck2, Clock } from "lucide-react";
import { DatePicker } from "@geiger/ui/date-picker";
import { cn } from "@/lib/utils";
import { callApi } from "@/lib/forms/api";
import { formatSlot } from "@/lib/forms/logic";
import { fieldIds } from "./field-shell";

function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const noopSubscribe = () => () => {};

// True only on the client, so date math in the visitor's timezone never mismatches the server render.
function useMounted() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

function timeLabel(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Booking slot picker: calendar (bookable weekdays within the horizon) + slot grid from GET /slots.
export function BookingField({ field, value, onChange, disabled, aria, slug, tr }) {
  const cfg = field.config || {};
  const days = Array.isArray(cfg.days) && cfg.days.length ? cfg.days.map(Number) : [1, 2, 3, 4, 5];
  const horizon = Number(cfg.horizonDays) || 30;
  const leadHours = Number(cfg.leadHours) || 0;
  const ids = fieldIds(field);
  const locked = disabled || field.readOnly;
  const [date, setDate] = useState(() => (value && !Number.isNaN(Date.parse(value)) ? startOfDay(new Date(value)) : undefined));
  const [slots, setSlots] = useState([]);
  const [status, setStatus] = useState("idle");

  const bounds = useMemo(() => {
    const now = new Date();
    const first = startOfDay(new Date(now.getTime() + leadHours * 3_600_000));
    const lastDay = startOfDay(new Date(now.getTime() + horizon * 86_400_000));
    return { first, last: lastDay };
  }, [leadHours, horizon]);

  const dateKey = date ? ymd(date) : "";
  const mounted = useMounted();

  useEffect(() => {
    if (!dateKey || !slug) return undefined;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    callApi(`/api/public/forms/${encodeURIComponent(slug)}/slots?fieldId=${encodeURIComponent(field.id)}&date=${dateKey}`, {
      signal: controller.signal,
    }).then((res) => {
      if (controller.signal.aborted) return;
      setSlots(res.ok && Array.isArray(res.data?.slots) ? res.data.slots : []);
      setStatus(res.ok ? "ready" : "error");
    });
    return () => controller.abort();
  }, [dateKey, slug, field.id]);

  if (!mounted) return <div className="h-80 animate-pulse rounded-lg border border-border bg-surface-card" aria-busy="true" />;

  return (
    <div className="grid gap-3" {...aria}>
      <div className="grid gap-3 rounded-lg border border-border bg-surface-card p-2 sm:grid-cols-[auto_1fr] sm:p-3">
        <DatePicker
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (locked || !d) return;
            setDate(d);
            if (value && ymd(new Date(value)) !== ymd(d)) onChange(undefined);
          }}
          disabled={[{ before: bounds.first }, { after: bounds.last }, (d) => !days.includes(d.getDay())]}
          startMonth={bounds.first}
          endMonth={bounds.last}
          className="mx-auto rounded-md bg-transparent p-1"
        />
        <div className="min-w-0 sm:border-l sm:border-border sm:pl-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <Clock className="size-3.5" />
            {date ? date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : tr("pickDate")}
          </p>
          {!slug ? (
            <p className="text-xs text-text-tertiary">{tr("previewOnly")}</p>
          ) : !date ? (
            <p className="text-xs text-text-tertiary">{tr("pickTime")}</p>
          ) : status === "loading" ? (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={tr("slotsLoading")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-md bg-surface-active" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-xs text-text-tertiary">{tr("noSlots")}</p>
          ) : (
            <div role="radiogroup" aria-labelledby={ids.label} className="grid grid-cols-3 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((slot) => {
                const selected = value === slot.start;
                const unavailable = slot.available === false;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={locked || unavailable}
                    onClick={() => onChange(slot.start)}
                    className={cn(
                      "h-9 rounded-md border text-sm tabular-nums outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-border-strong",
                      unavailable && "cursor-not-allowed text-text-tertiary line-through opacity-50",
                    )}
                  >
                    {timeLabel(slot.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {value && (
        <p id={ids.control} className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          <CalendarCheck2 className="size-4" />
          {formatSlot(value)}
        </p>
      )}
    </div>
  );
}
