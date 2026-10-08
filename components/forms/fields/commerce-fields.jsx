"use client";

import { useState } from "react";
import { Equal, Minus, Plus, Receipt, Tag, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Checkbox } from "@geiger/ui/checkbox";
import { cn } from "@/lib/utils";
import { computeOrder, evaluateFormula, formatMoney } from "@/lib/forms/logic";
import { choiceCardClass, fieldIds } from "./field-shell";

// Formats a calculated value per config.format (number | currency | percent).
export function formatCalculated(value, format, currency) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (format === "currency") return formatMoney(n, currency);
  const text = n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return format === "percent" ? `${text}%` : text;
}

export function CalculatedField({ field, label, allFields, answers, currency }) {
  const value = evaluateFormula(field.formula, allFields || [], answers || {});
  const ids = fieldIds(field);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-3">
      <span id={ids.label} className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
        <Equal className="size-4 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </span>
      <output aria-labelledby={ids.label} aria-live="polite" suppressHydrationWarning className="shrink-0 font-mono text-lg font-semibold tabular-nums text-foreground">
        {formatCalculated(value, field.config?.format, field.config?.currency || currency)}
      </output>
    </div>
  );
}

// Product line: price + description, with a quantity stepper or a fixed add-to-order checkbox.
export function ProductField({ field, label, value, onChange, disabled, aria, currency, tr }) {
  const cfg = field.config || {};
  const price = Number(cfg.price) || 0;
  const fixed = cfg.quantityMode === "fixed";
  const maxQty = Math.max(1, Number(cfg.maxQuantity) || 10);
  const ids = fieldIds(field);
  const locked = disabled || field.readOnly;
  const qty = fixed ? (value ? 1 : 0) : Math.max(0, Math.floor(Number(value) || 0));
  const setQty = (n) => onChange(Math.max(0, Math.min(maxQty, n)) || undefined);

  const header = (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span id={ids.label} className="font-medium text-foreground">
          {label}
          {field.required && <span className="ml-1 text-red-500 dark:text-red-400" aria-hidden="true">*</span>}
        </span>
        <span suppressHydrationWarning className="text-sm font-semibold tabular-nums text-foreground">
          {formatMoney(price, currency)}
        </span>
      </div>
      {cfg.description && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{cfg.description}</p>}
    </div>
  );

  if (fixed) {
    return (
      <label htmlFor={ids.control} className={cn(choiceCardClass(qty > 0, { disabled: locked }), "items-start")}>
        <Checkbox id={ids.control} checked={qty > 0} disabled={locked} onCheckedChange={(c) => onChange(c === true)} className="mt-0.5" {...aria} />
        {header}
      </label>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border bg-surface-card p-3.5 sm:flex-row sm:items-center", qty > 0 ? "border-primary" : "border-border")}>
      {header}
      <div className="flex items-center gap-1.5 self-end sm:self-auto">
        <Button type="button" size="icon-sm" variant="outline" disabled={locked || qty <= 0} aria-label={`${tr("quantity")} −`} onClick={() => setQty(qty - 1)}>
          <Minus />
        </Button>
        <Input
          id={ids.control}
          type="number"
          inputMode="numeric"
          min={0}
          max={maxQty}
          value={qty || ""}
          placeholder="0"
          disabled={locked}
          aria-label={`${tr("quantity")}: ${label}`}
          onChange={(e) => setQty(Number(e.target.value))}
          className="w-16 bg-background text-center tabular-nums"
          {...aria}
        />
        <Button type="button" size="icon-sm" variant="outline" disabled={locked || qty >= maxQty} aria-label={`${tr("quantity")} +`} onClick={() => setQty(qty + 1)}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

// Order summary from computeOrder, with an optional coupon box (stored in answers.__coupon).
export function OrderTotal({ field, label, form, allFields, answers, onSetAnswer, disabled, tr }) {
  const settings = form?.settings || {};
  const payments = settings.payments || {};
  const order = computeOrder({ fieldDefs: allFields || form?.fieldDefs || [], settings }, answers || {});
  const appliedCode = String(answers?.__coupon || "");
  const [draft, setDraft] = useState("");
  const couponsEnabled = Boolean(payments.hasCoupons || (payments.coupons || []).length);
  const interval = order.mode === "subscription" ? tr("perInterval", { interval: order.interval }) : "";
  const ids = fieldIds(field);
  const applyCoupon = () => {
    if (draft.trim()) onSetAnswer?.("__coupon", draft.trim());
    setDraft("");
  };

  return (
    <section aria-labelledby={ids.label} className="overflow-hidden rounded-lg border border-border bg-surface-card">
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Receipt className="size-4 text-text-tertiary" aria-hidden="true" />
        <h3 id={ids.label} className="text-sm font-medium text-foreground">
          {label || tr("total")}
        </h3>
      </header>
      <div className="grid gap-2 px-4 py-3 text-sm">
        {order.items.length === 0 ? (
          <p className="text-xs text-text-tertiary">{tr("noItems")}</p>
        ) : (
          order.items.map((item) => (
            <div key={item.fieldId} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-text-secondary">
                {item.name}
                {item.quantity > 1 && <span className="text-text-tertiary"> × {item.quantity}</span>}
              </span>
              <span suppressHydrationWarning className="shrink-0 tabular-nums text-foreground">
                {formatMoney(item.amount, order.currency)}
              </span>
            </div>
          ))
        )}
        {order.discount > 0 && (
          <>
            <div className="mt-1 flex justify-between gap-3 border-t border-border pt-2 text-text-secondary">
              <span>{tr("subtotal")}</span>
              <span suppressHydrationWarning className="tabular-nums">
                {formatMoney(order.subtotal, order.currency)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-emerald-600 dark:text-emerald-400">
              <span>
                {tr("discount")} ({order.coupon?.code})
              </span>
              <span suppressHydrationWarning className="tabular-nums">
                −{formatMoney(order.discount, order.currency)}
              </span>
            </div>
          </>
        )}
      </div>
      {couponsEnabled && (
        <div className="border-t border-border px-4 py-3">
          {appliedCode ? (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <Tag className="size-3" />
                {appliedCode.toUpperCase()}
              </span>
              <Button type="button" size="xs" variant="ghost" disabled={disabled || !onSetAnswer} onClick={() => onSetAnswer?.("__coupon", undefined)}>
                <X />
                {tr("couponRemove")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCoupon();
                  }
                }}
                placeholder={tr("coupon")}
                aria-label={tr("coupon")}
                disabled={disabled || !onSetAnswer}
                className="h-9 bg-background uppercase placeholder:normal-case"
              />
              <Button type="button" variant="outline" disabled={disabled || !onSetAnswer || !draft.trim()} onClick={applyCoupon}>
                {tr("apply")}
              </Button>
            </div>
          )}
        </div>
      )}
      <footer className="flex items-baseline justify-between gap-3 border-t border-border bg-surface-subtle px-4 py-3">
        <span className="text-sm font-medium text-foreground">{tr("total")}</span>
        <span className="text-lg font-semibold tabular-nums text-foreground">
          <span suppressHydrationWarning>{formatMoney(order.total, order.currency)}</span>
          {interval && <span className="ml-1 text-xs font-normal text-text-secondary">{interval}</span>}
        </span>
      </footer>
    </section>
  );
}
