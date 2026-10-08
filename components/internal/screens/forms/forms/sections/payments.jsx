"use client";

import { useMemo, useState } from "react";
import { Package } from "lucide-react";

import { Badge } from "@geiger/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { computeOrder, formatMoney } from "@/lib/forms/logic";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "../constants";
import { AddButton, BuilderLink, CopyField, FIELD_CLS, ItemCard, Note, NumberInput, Stack, TextInput, useOrigin } from "./kit";
import { withPrefix } from "@/lib/workspace/base-path";

// Stripe checkout: currency, one-off vs subscription.
export function GatewaysSection({ settings, setGroup }) {
  const origin = useOrigin();
  const payments = settings.payments || {};
  return (
    <Stack>
      <SectionCard title="Collect payments" description="Respondents are sent to Stripe Checkout after submitting; the response waits as “Awaiting payment” until paid.">
        <SettingsList>
          <SettingRow title="Enable payments" checked={Boolean(payments.enabled)} onCheckedChange={(v) => setGroup("payments", { enabled: v })} />
        </SettingsList>
        {payments.enabled ? (
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Currency">
                <Select value={payments.currency || "usd"} onValueChange={(v) => setGroup("payments", { currency: v })}>
                  <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Charge">
                <Tabs value={payments.mode || "payment"} onValueChange={(v) => setGroup("payments", { mode: v })}>
                  <TabsList>
                    <TabsTrigger value="payment">One-off</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
            </div>
            {payments.mode === "subscription" ? (
              <Field label="Billing interval" className="max-w-xs">
                <Tabs value={payments.interval || "month"} onValueChange={(v) => setGroup("payments", { interval: v })}>
                  <TabsList>
                    <TabsTrigger value="month">Monthly</TabsTrigger>
                    <TabsTrigger value="year">Yearly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </Field>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Stripe connection" description="Payments run through your own Stripe account.">
        <div className="grid gap-3 text-sm text-text-secondary">
          <p>
            Set <code className="rounded bg-surface-card px-1 text-foreground">STRIPE_SECRET_KEY</code> and{" "}
            <code className="rounded bg-surface-card px-1 text-foreground">STRIPE_WEBHOOK_SECRET</code> in the app&apos;s environment, then add this endpoint in Stripe → Developers → Webhooks
            (events: <code className="rounded bg-surface-card px-1">checkout.session.completed</code>, <code className="rounded bg-surface-card px-1">invoice.paid</code>):
          </p>
          <CopyField value={`${origin}${withPrefix("/api/stripe/webhook")}`} label="Webhook URL copied" />
        </div>
      </SectionCard>
    </Stack>
  );
}

// Product fields + a sample total using the same engine as checkout.
export function OrderSection({ form, settings, openBuilder }) {
  const products = useMemo(() => (form.fieldDefs || []).filter((f) => f.type === "product" && f.included !== false), [form.fieldDefs]);
  const [qty, setQty] = useState({});
  const [coupon, setCoupon] = useState("");
  const sample = useMemo(() => {
    const answers = { __coupon: coupon };
    for (const p of products) {
      const fixed = p.config?.quantityMode === "fixed";
      answers[p.id] = fixed ? qty[p.id] ?? true : qty[p.id] ?? 1;
    }
    return computeOrder({ fieldDefs: form.fieldDefs, settings }, answers);
  }, [products, qty, coupon, form.fieldDefs, settings]);
  const currency = settings.payments?.currency || "usd";

  if (!products.length) {
    return <BuilderLink onOpenBuilder={openBuilder}>No product fields yet. Add Product and Order total fields in the builder to sell items.</BuilderLink>;
  }

  return (
    <Stack>
      {!settings.payments?.enabled ? <Note tone="warning">Payments are off — turn them on under Gateways to charge for these products.</Note> : null}
      <SectionCard title="Products" description="Prices and quantity modes come from each Product field. Try quantities to preview the total.">
        <div className="divide-y divide-border">
          {products.map((p) => {
            const fixed = p.config?.quantityMode === "fixed";
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-card text-text-secondary">
                  <Package className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{p.label || p.title}</p>
                  <p className="text-xs text-text-tertiary">
                    {formatMoney(Number(p.config?.price) || 0, currency)} · {fixed ? "Fixed (on/off)" : `Quantity up to ${p.config?.maxQuantity ?? 10}`}
                  </p>
                </div>
                {fixed ? (
                  <Switch checked={qty[p.id] ?? true} onCheckedChange={(v) => setQty((q) => ({ ...q, [p.id]: v }))} aria-label={`Include ${p.title}`} />
                ) : (
                  <NumberInput value={qty[p.id] ?? 1} min={0} onChange={(v) => setQty((q) => ({ ...q, [p.id]: v }))} className="w-20" />
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard title="Sample order">
        <div className="grid gap-4">
          <Field label="Try a coupon code" className="max-w-xs">
            <TextInput value={coupon} onChange={setCoupon} placeholder="EARLYBIRD" />
          </Field>
          <dl className="space-y-1.5 text-sm">
            {sample.items.map((i) => (
              <div key={i.fieldId} className="flex justify-between text-text-secondary">
                <dt>
                  {i.quantity} × {i.name}
                </dt>
                <dd className="tabular-nums">{formatMoney(i.amount, sample.currency)}</dd>
              </div>
            ))}
            {sample.discount ? (
              <div className="flex justify-between text-emerald-400">
                <dt>Discount ({sample.coupon?.code})</dt>
                <dd className="tabular-nums">−{formatMoney(sample.discount, sample.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <dt>Total{sample.mode === "subscription" ? ` / ${sample.interval}` : ""}</dt>
              <dd className="tabular-nums">{formatMoney(sample.total, sample.currency)}</dd>
            </div>
          </dl>
        </div>
      </SectionCard>
      <BuilderLink onOpenBuilder={openBuilder}>Change prices, quantity limits or add products in the builder.</BuilderLink>
    </Stack>
  );
}

// Coupon codes live in settings.payments.coupons.
export function CouponsSection({ settings, setGroup }) {
  const coupons = settings.payments?.coupons || [];
  const currency = (settings.payments?.currency || "usd").toUpperCase();
  const update = (i, patch) => setGroup("payments", { coupons: coupons.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const remove = (i) => setGroup("payments", { coupons: coupons.filter((_, j) => j !== i) });
  const add = () => setGroup("payments", { coupons: [...coupons, { code: "", type: "percent", value: 10, active: true }] });
  const codes = coupons.map((c) => String(c.code).trim().toLowerCase());

  return (
    <Stack>
      <SectionCard title="Coupon codes" description="Respondents enter a code at checkout. Codes aren't case-sensitive." action={<AddButton onClick={add}>Add coupon</AddButton>}>
        {coupons.length ? (
          <div className="space-y-3">
            {coupons.map((c, i) => {
              const dupe = c.code && codes.indexOf(String(c.code).trim().toLowerCase()) !== i;
              return (
                <ItemCard key={i} onRemove={() => remove(i)} removeLabel="Remove coupon">
                  <div className="grid gap-3 pr-8 sm:grid-cols-[1fr_150px_120px_auto] sm:items-end">
                    <Field label="Code">
                      <TextInput value={c.code} onChange={(v) => update(i, { code: v.toUpperCase().replace(/\s+/g, "") })} placeholder="SPRING20" className="font-mono" />
                    </Field>
                    <Field label="Type">
                      <Select value={c.type || "percent"} onValueChange={(v) => update(i, { type: v })}>
                        <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">% off</SelectItem>
                          <SelectItem value="amount">{currency} off</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Value">
                      <NumberInput value={c.value} min={0} max={c.type === "percent" ? 100 : undefined} onChange={(v) => update(i, { value: v })} />
                    </Field>
                    <div className="flex h-9 items-center gap-2">
                      <Switch checked={c.active !== false} onCheckedChange={(v) => update(i, { active: v })} aria-label="Coupon active" />
                      <Badge variant={c.active !== false ? "success" : "neutral"}>{c.active !== false ? "Active" : "Paused"}</Badge>
                    </div>
                  </div>
                  {dupe ? <p className="mt-2 text-xs text-red-400">This code is already used above.</p> : null}
                  {!c.code ? <p className="mt-2 text-xs text-amber-400">Give this coupon a code.</p> : null}
                </ItemCard>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No coupons yet.</p>
        )}
      </SectionCard>
      {!settings.payments?.enabled ? <Note tone="warning">Payments are off — coupons only apply when Gateways → Enable payments is on.</Note> : null}
    </Stack>
  );
}
