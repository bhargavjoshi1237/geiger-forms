"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { Input } from "@geiger/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import { Textarea } from "@geiger/ui/textarea";
import { REPEATER_SUBTYPES, getFieldType } from "@/lib/forms/field-types";
import { makeFieldId } from "@/lib/forms/schema";
import { ControlLabel, FieldRow, NumberInput, StringListEditor, SubtleNote, TextInput } from "./builder-controls";
import { OptionsEditor } from "./options-editor";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let timezoneCache = null;
function timezones() {
  if (!timezoneCache) {
    try {
      timezoneCache = Intl.supportedValuesOf("timeZone");
    } catch {
      timezoneCache = ["UTC"];
    }
  }
  return timezoneCache;
}

function BookingSettings({ config, setConfig, fieldId }) {
  const days = Array.isArray(config.days) ? config.days : [1, 2, 3, 4, 5];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <ControlLabel>Available days</ControlLabel>
        <ToggleGroup type="multiple" value={days.map(String)} onValueChange={(v) => setConfig({ days: v.map(Number).sort() })} spacing={1} className="flex-wrap">
          {WEEKDAYS.map((label, d) => (
            <ToggleGroupItem
              key={label}
              value={String(d)}
              className="h-7 min-w-0 rounded-md border border-border bg-background px-2 text-xs font-normal text-text-tertiary transition-colors hover:bg-background hover:text-foreground data-[state=on]:border-border-strong data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <FieldRow label="Day starts"><Input type="time" value={config.start || "09:00"} onChange={(e) => setConfig({ start: e.target.value })} className="h-8 bg-background text-sm" /></FieldRow>
        <FieldRow label="Day ends"><Input type="time" value={config.end || "17:00"} onChange={(e) => setConfig({ end: e.target.value })} className="h-8 bg-background text-sm" /></FieldRow>
        <FieldRow label="Slot length (min)"><NumberInput min={5} step={5} value={config.slotMinutes ?? 30} onChange={(v) => setConfig({ slotMinutes: v })} /></FieldRow>
        <FieldRow label="Bookings per slot"><NumberInput min={1} value={config.capacity ?? 1} onChange={(v) => setConfig({ capacity: v })} /></FieldRow>
        <FieldRow label="Bookable days ahead"><NumberInput min={1} value={config.horizonDays ?? 30} onChange={(v) => setConfig({ horizonDays: v })} /></FieldRow>
        <FieldRow label="Minimum notice (h)"><NumberInput min={0} value={config.leadHours ?? 2} onChange={(v) => setConfig({ leadHours: v })} /></FieldRow>
      </div>
      <FieldRow label="Timezone" hint="Slots are generated in this timezone and shown in the respondent's local time.">
        <Input list={`tz-${fieldId}`} value={config.timezone || ""} onChange={(e) => setConfig({ timezone: e.target.value })} placeholder="UTC" className="h-8 bg-background text-sm" />
        <datalist id={`tz-${fieldId}`}>
          {timezones().map((tz) => <option key={tz} value={tz} />)}
        </datalist>
      </FieldRow>
    </div>
  );
}

function RepeaterSettings({ config, setConfig }) {
  const subs = Array.isArray(config.subFields) ? config.subFields : [];
  const setSubs = (next) => setConfig({ subFields: next });
  const updateSub = (id, patch) => setSubs(subs.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const moveSub = (i, dir) => {
    const next = [...subs];
    const [item] = next.splice(i, 1);
    next.splice(i + dir, 0, item);
    setSubs(next);
  };
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <ControlLabel hint="Each entry the respondent adds repeats these fields.">Sub-fields</ControlLabel>
        {subs.length === 0 ? <SubtleNote>No sub-fields yet.</SubtleNote> : null}
        {subs.map((sub, i) => (
          <div key={sub.id} className="space-y-2 rounded-md border border-border bg-background p-2.5">
            <div className="flex items-center gap-1.5">
              <Input value={sub.label || ""} onChange={(e) => updateSub(sub.id, { label: e.target.value })} placeholder="Label" aria-label="Sub-field label" className="h-8 min-w-0 flex-1 bg-surface-subtle text-sm" />
              <Select value={sub.type || "text"} onValueChange={(type) => updateSub(sub.id, { type, options: type === "dropdown" ? sub.options?.length ? sub.options : ["Option 1", "Option 2"] : [] })}>
                <SelectTrigger className="h-8 w-32 shrink-0 bg-surface-subtle text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{REPEATER_SUBTYPES.map((t) => <SelectItem key={t} value={t}>{getFieldType(t).label}</SelectItem>)}</SelectContent>
              </Select>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Move up" disabled={i === 0} onClick={() => moveSub(i, -1)}><ArrowUp /></Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Move down" disabled={i === subs.length - 1} onClick={() => moveSub(i, 1)}><ArrowDown /></Button>
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Remove sub-field" className="hover:text-red-400" onClick={() => setSubs(subs.filter((s) => s.id !== sub.id))}><X /></Button>
            </div>
            {sub.type === "dropdown" ? (
              <StringListEditor items={sub.options || []} onChange={(options) => updateSub(sub.id, { options })} placeholder="Choice" addLabel="Add choice" />
            ) : null}
            <label className="flex items-center justify-end gap-2 text-xs text-text-secondary">
              Required
              <Switch checked={Boolean(sub.required)} onCheckedChange={(required) => updateSub(sub.id, { required })} aria-label="Sub-field required" />
            </label>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-full gap-1.5 text-xs"
          onClick={() => setSubs([...subs, { id: makeFieldId("sub"), type: "text", label: `Field ${subs.length + 1}`, required: false, options: [] }])}
        >
          <Plus className="h-3.5 w-3.5" />Add sub-field
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <FieldRow label="Min entries"><NumberInput min={0} value={config.minRows ?? 0} onChange={(v) => setConfig({ minRows: v })} /></FieldRow>
        <FieldRow label="Max entries"><NumberInput min={1} value={config.maxRows ?? 10} onChange={(v) => setConfig({ maxRows: v })} /></FieldRow>
        <FieldRow label="Add button"><TextInput value={config.addLabel ?? "Add another"} onChange={(v) => setConfig({ addLabel: v })} /></FieldRow>
      </div>
    </div>
  );
}

// Type-specific configuration for a field — returns JSX or null so callers can skip the wrapper (choices, scales, bookings, products, repeaters…).
export function renderTypeSettings({ field, onChange, scoring, quiz, currency }) {
  const config = field.config || {};
  const setConfig = (patch) => onChange({ config: { ...config, ...patch } });

  switch (field.type) {
    case "select":
    case "dropdown":
    case "multiselect":
    case "ranking":
      return <OptionsEditor field={field} onChange={onChange} scoring={scoring} quiz={quiz} />;
    case "matrix":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <ControlLabel>Rows</ControlLabel>
            <StringListEditor items={config.rows || []} onChange={(rows) => setConfig({ rows })} placeholder="Row" addLabel="Add row" emptyText="No rows yet." />
          </div>
          <OptionsEditor field={field} onChange={onChange} label="Columns" />
        </div>
      );
    case "rating":
      return (
        <FieldRow label="Number of stars" className="max-w-40">
          <Select value={String(config.max ?? 5)} onValueChange={(v) => setConfig({ max: Number(v) })}>
            <SelectTrigger className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
          </Select>
        </FieldRow>
      );
    case "scale":
    case "nps":
      return (
        <div className="grid grid-cols-2 gap-3">
          {field.type === "scale" ? (
            <>
              <FieldRow label="Lowest value"><NumberInput value={config.min ?? 1} onChange={(v) => setConfig({ min: v })} /></FieldRow>
              <FieldRow label="Highest value"><NumberInput value={config.max ?? 10} onChange={(v) => setConfig({ max: v })} /></FieldRow>
            </>
          ) : null}
          <FieldRow label="Low label"><TextInput value={config.minLabel} onChange={(v) => setConfig({ minLabel: v })} placeholder="Not likely" /></FieldRow>
          <FieldRow label="High label"><TextInput value={config.maxLabel} onChange={(v) => setConfig({ maxLabel: v })} placeholder="Very likely" /></FieldRow>
        </div>
      );
    case "booking":
      return <BookingSettings config={config} setConfig={setConfig} fieldId={field.id} />;
    case "file":
      return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FieldRow label="Max files"><NumberInput min={1} max={20} value={config.maxFiles ?? 1} onChange={(v) => setConfig({ maxFiles: v })} /></FieldRow>
          <FieldRow label="Max size (MB)"><NumberInput min={1} max={50} value={config.maxSizeMb ?? 10} onChange={(v) => setConfig({ maxSizeMb: v })} /></FieldRow>
          <FieldRow label="Accepted types" hint="e.g. .pdf,image/*" className="col-span-2 sm:col-span-1">
            <TextInput value={config.accept} onChange={(v) => setConfig({ accept: v })} placeholder="Any file" />
          </FieldRow>
        </div>
      );
    case "product":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label={`Price (${(currency || "usd").toUpperCase()})`}><NumberInput min={0} step="0.01" value={config.price} onChange={(v) => setConfig({ price: v })} /></FieldRow>
            <FieldRow label="Quantity">
              <Select value={config.quantityMode || "input"} onValueChange={(quantityMode) => setConfig({ quantityMode })}>
                <SelectTrigger className="h-8 w-full bg-background text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="input">Respondent picks a quantity</SelectItem>
                  <SelectItem value="fixed">Single item (add / skip)</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            {config.quantityMode !== "fixed" ? (
              <FieldRow label="Max quantity"><NumberInput min={1} value={config.maxQuantity ?? 10} onChange={(v) => setConfig({ maxQuantity: v })} /></FieldRow>
            ) : null}
          </div>
          <FieldRow label="Description">
            <Textarea value={config.description || ""} onChange={(e) => setConfig({ description: e.target.value })} rows={2} className="min-h-14 resize-y bg-background text-sm" placeholder="What the respondent is buying" />
          </FieldRow>
          <SubtleNote>Checkout runs when payments are enabled in the form&apos;s settings.</SubtleNote>
        </div>
      );
    case "currency":
      return (
        <FieldRow label="Currency" hint="Leave blank to use the form's payment currency." className="max-w-48">
          <TextInput value={config.currency} onChange={(v) => setConfig({ currency: v.toLowerCase().slice(0, 3) || undefined })} placeholder={currency || "usd"} />
        </FieldRow>
      );
    case "repeater":
      return <RepeaterSettings config={config} setConfig={setConfig} />;
    case "total":
      return <SubtleNote>Shows the running order total from the product fields (after coupons).</SubtleNote>;
    case "hidden":
      return <SubtleNote>Hidden fields are never shown. Fill them from a URL parameter (prefill key under Advanced) or a default value.</SubtleNote>;
    default:
      return null;
  }
}
