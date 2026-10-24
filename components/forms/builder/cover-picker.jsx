"use client";

import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@geiger/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@geiger/ui/toggle-group";
import { ImageInput } from "@/components/forms/image-input";
import { COVER_GRADIENTS } from "./cover-presets";
import { ControlLabel, SubtleNote } from "./builder-controls";

// Cover controls shared by the canvas "Change cover" popover and the Form style section.
export function CoverPicker({ formId, settings, onChange }) {
  const enabled = settings.coverStyle === "cover";
  const activeGradient = settings.coverGradient || COVER_GRADIENTS[0].id;
  const url = settings.coverUrl || "";

  return (
    <div className="space-y-3">
      <ToggleGroup type="single" value={settings.coverStyle || "none"} onValueChange={(v) => v && onChange({ coverStyle: v })} spacing={2} className="grid w-full grid-cols-2">
        {[
          { value: "none", label: "No cover" },
          { value: "cover", label: "Cover" },
        ].map((opt) => (
          <ToggleGroupItem
            key={opt.value}
            value={opt.value}
            className="h-9 w-full rounded-md border border-border bg-background text-xs font-medium text-text-secondary transition-colors hover:bg-background hover:text-foreground data-[state=on]:border-border-strong data-[state=on]:bg-surface-hover data-[state=on]:text-foreground"
          >
            {opt.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {enabled ? (
        <>
          <div className="space-y-1.5">
            <ControlLabel>Gradient</ControlLabel>
            <div className="grid grid-cols-6 gap-1.5">
              {COVER_GRADIENTS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  title={g.label}
                  aria-label={`${g.label} gradient`}
                  aria-pressed={!url && activeGradient === g.id}
                  onClick={() => onChange({ coverGradient: g.id, coverUrl: "" })}
                  style={{ background: g.css }}
                  className={cn("h-8 rounded-md border transition-shadow", !url && activeGradient === g.id ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-border-strong")}
                />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <ControlLabel>Image</ControlLabel>
            <ImageInput compact formId={formId} value={url} onChange={(coverUrl) => onChange({ coverUrl })} placeholder="https://images.example.com/cover.jpg" label="cover image" />
          </div>
          {url ? (
            <Button type="button" variant="ghost" size="xs" onClick={() => onChange({ coverUrl: "" })} className="h-auto gap-1 px-0 font-normal hover:bg-transparent has-[>svg]:px-0 text-[11px] text-text-tertiary hover:text-foreground">
              <ImageOff className="h-3 w-3" />Use gradient instead
            </Button>
          ) : (
            <SubtleNote>Upload or link a photo, or pick a gradient.</SubtleNote>
          )}
        </>
      ) : null}
    </div>
  );
}
