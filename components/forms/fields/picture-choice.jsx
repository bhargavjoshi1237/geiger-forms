"use client";

import { Check, ImageOff } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@geiger/ui/radio-group";
import { Checkbox } from "@geiger/ui/checkbox";
import { cn } from "@/lib/utils";
import { isMultiChoice } from "@/lib/forms/field-types";
import { imageSource } from "@/lib/forms/media";
import { fieldIds } from "./field-shell";
import { KeyBadge, advanceProps } from "./choice-fields";

const COLUMNS = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-4" };

// One image card; the visually hidden radio/checkbox inside carries the semantics and keyboard focus.
function PictureCard({ option, index, image, control, selected, locked, large, hideLabels, advance, optId }) {
  const src = imageSource(image?.url);
  return (
    <label
      htmlFor={optId}
      {...advance}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface-card text-left text-sm transition-[border-color,background-color,box-shadow] duration-150 outline-none focus-within:ring-[3px] focus-within:ring-ring/40",
        selected ? "border-primary text-foreground shadow-[inset_0_0_0_1px_var(--primary)]" : "border-border text-text-secondary hover:border-border-strong hover:text-foreground",
        locked && "pointer-events-none opacity-60",
      )}
    >
      <span className="relative block aspect-[4/3] bg-surface-hover">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={image?.alt || ""} loading="lazy" decoding="async" className="size-full object-cover" />
        ) : (
          <ImageOff className="absolute inset-0 m-auto size-6 text-text-tertiary" aria-hidden="true" />
        )}
        {large ? (
          <span className="absolute top-2 left-2 rounded-md bg-background/80">
            <KeyBadge index={index} selected={selected} />
          </span>
        ) : null}
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-2 right-2 flex size-6 items-center justify-center rounded-full border transition-opacity",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-background/80 opacity-0 group-hover:opacity-100",
          )}
        >
          <Check className="size-3.5" />
        </span>
      </span>
      <span className={cn("break-words", large ? "px-4 py-3 text-base" : "px-3 py-2.5", hideLabels && "sr-only")}>{option}</span>
      {control}
    </label>
  );
}

// Picture choice over image cards: radio semantics (arrow keys via Radix) for one pick, checkboxes for several.
export function PictureChoice({ field, value, onChange, disabled, aria, large, onAdvance }) {
  const options = field.options || [];
  const cfg = field.config || {};
  const images = cfg.images || {};
  const ids = fieldIds(field);
  const multi = isMultiChoice(field.type);
  const locked = disabled || field.readOnly;
  const grid = cn("grid grid-cols-2 gap-3", COLUMNS[cfg.columns] || COLUMNS[3]);
  const optId = (i) => `${ids.control}-opt-${i}`;
  const cardProps = (opt, i) => ({ option: opt, index: i, image: images[opt], large, hideLabels: Boolean(cfg.hideLabels), optId: optId(i) });

  if (!multi) {
    const advance = advanceProps(onAdvance);
    return (
      <RadioGroup value={value ?? ""} onValueChange={onChange} disabled={locked} className={grid} aria-labelledby={ids.label} {...aria}>
        {options.map((opt, i) => (
          <PictureCard
            key={opt}
            {...cardProps(opt, i)}
            selected={value === opt}
            locked={locked}
            advance={advance}
            control={<RadioGroupItem id={optId(i)} value={opt} className="sr-only" />}
          />
        ))}
      </RadioGroup>
    );
  }

  const selected = Array.isArray(value) ? value : [];
  const max = Number(field.validation?.maxSelect) || 0;
  const toggle = (opt) => {
    const next = selected.includes(opt) ? selected.filter((o) => o !== opt) : [...selected, opt];
    onChange(options.filter((o) => next.includes(o)));
  };
  return (
    <div role="group" aria-labelledby={ids.label} className={grid} {...aria}>
      {options.map((opt, i) => {
        const checked = selected.includes(opt);
        const optLocked = locked || (max > 0 && selected.length >= max && !checked);
        return (
          <PictureCard
            key={opt}
            {...cardProps(opt, i)}
            selected={checked}
            locked={optLocked}
            control={<Checkbox id={optId(i)} checked={checked} disabled={optLocked} onCheckedChange={() => toggle(opt)} className="sr-only" />}
          />
        );
      })}
    </div>
  );
}
