"use client";

import { useCallback, useMemo, useState } from "react";
import { FunctionSquare, ImageIcon, MousePointerClick, Plus, SplitSquareVertical } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { cn } from "@/lib/utils";
import { getFieldType, isInputField } from "@/lib/forms/field-types";
import { FieldTypeIcon } from "./builder-controls";
import { coverBackground } from "./cover-presets";
import { CoverPicker } from "./cover-picker";
import { FieldCard } from "./field-card";
import { FieldPalette, PALETTE_MIME } from "./field-palette";
import { PageBreakCard } from "./page-break-card";

const MIN_WIDTH = 480;
const MAX_WIDTH = 820;
const QUICK_TYPES = ["text", "email", "select", "textarea", "date", "rating"];

function DropLine() {
  return (
    <div className="pointer-events-none absolute -top-2.5 inset-x-0 z-30 flex items-center">
      <div className="h-2 w-2 rounded-full bg-sky-400" />
      <div className="h-0.5 flex-1 bg-sky-400" />
    </div>
  );
}

function ResizeHandle({ onMouseDown }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Resize canvas width"
      title="Drag to resize"
      onMouseDown={onMouseDown}
      className="absolute bottom-1 right-1 h-7 w-7 cursor-nwse-resize text-muted-foreground opacity-50 transition-opacity hover:text-muted-foreground hover:opacity-100"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M 6 10 L 10 6 L 10 10 Z" fill="currentColor" />
        <path d="M 2 10 L 10 2 L 10 4 L 4 10 Z" fill="currentColor" />
      </svg>
    </Button>
  );
}

// Empty canvas: a drop target with one-click starters for the most common field types.
function EmptyCanvas({ active, onDragOver, onDrop, onPick }) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
        active ? "border-sky-400 bg-sky-500/5" : "border-border bg-surface-subtle",
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface-card text-text-secondary">
        <MousePointerClick className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Start building your form</p>
        <p className="mx-auto max-w-sm text-sm text-text-secondary">Pick a field to begin, or drag any field type from the sidebar onto the canvas.</p>
      </div>
      <div className="flex max-w-md flex-wrap justify-center gap-2">
        {QUICK_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPick(type)}
            className="gap-1.5 bg-surface-card text-xs font-normal text-muted-foreground hover:border-border-strong hover:bg-surface-hover hover:text-foreground"
          >
            <FieldTypeIcon type={type} className="h-3.5 w-3.5 text-text-secondary" />
            {getFieldType(type)?.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// The editable form canvas: cover, field/page cards with drag-and-drop, and insert actions.
export function BuilderCanvas({
  doc,
  selectedId,
  sources,
  scoring,
  quiz,
  currency,
  onSettingsChange,
  onSelect,
  onFieldChange,
  onDuplicate,
  onDelete,
  onToggleIncluded,
  onMove,
  onInsert,
}) {
  const { fields, settings } = doc;
  const [canvasWidth, setCanvasWidth] = useState(760);
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);

  const visible = useMemo(() => fields.filter((f) => f.included !== false), [fields]);
  const numbering = useMemo(() => {
    const map = new Map();
    let q = 0;
    let p = 1;
    for (const f of visible) {
      if (f.type === "page") map.set(f.id, (p += 1));
      else if (isInputField(f.type) && f.type !== "hidden") map.set(f.id, (q += 1));
    }
    return map;
  }, [visible]);
  const hasPages = visible.some((f) => f.type === "page");

  const startResize = useCallback(
    (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = canvasWidth;
      const move = (me) => setCanvasWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (me.clientX - startX) * 2)));
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    },
    [canvasWidth],
  );

  const resetDrag = useCallback(() => {
    setDragId(null);
    setOverId(null);
  }, []);

  const onDragHandleStart = useCallback((e, id) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setDragId(id);
  }, []);

  const accepts = (e) => Boolean(dragId) || Array.from(e.dataTransfer.types || []).includes(PALETTE_MIME);

  const handleDragOver = (e, id) => {
    if (!accepts(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragId ? "move" : "copy";
    if (overId !== id) setOverId(id);
  };

  const handleDrop = (e, beforeId) => {
    if (!accepts(e)) return;
    e.preventDefault();
    const type = e.dataTransfer.getData(PALETTE_MIME);
    if (type) onInsert(type, { beforeId });
    else if (dragId && dragId !== beforeId) onMove(dragId, beforeId);
    resetDrag();
  };

  const handleLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOverId(null);
  };

  const pick = (type) => {
    setPaletteOpen(false);
    onInsert(type, { afterId: selectedId });
  };

  return (
    <section className={cn("relative flex flex-1 flex-col", visible.length && "pb-16")}>
      {settings.coverStyle === "cover" ? (
        <div className="relative h-[164px] border-b border-border" style={{ background: coverBackground(settings) }}>
          <Popover open={coverOpen} onOpenChange={setCoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="absolute right-4 top-3 gap-1.5 bg-surface-subtle/90 backdrop-blur">
                <ImageIcon className="h-3.5 w-3.5" />Change cover
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <CoverPicker settings={settings} onChange={onSettingsChange} />
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      {/* An empty canvas centres its starter block vertically; once fields exist they flow from the top. */}
      <div className={cn("mx-auto w-full px-10", visible.length ? "mt-6" : "my-auto py-6")} style={{ maxWidth: `${canvasWidth + 80}px` }}>
        <div className="relative space-y-4" onDragLeave={handleLeave}>
          {hasPages ? (
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              <SplitSquareVertical className="h-3.5 w-3.5" />Page 1
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyCanvas
              active={overId === "__end__"}
              onDragOver={(e) => handleDragOver(e, "__end__")}
              onDrop={(e) => handleDrop(e, null)}
              onPick={(type) => onInsert(type, { afterId: selectedId })}
            />
          ) : null}

          {visible.map((field) => (
            <div
              key={field.id}
              className="relative"
              onDragOver={(e) => handleDragOver(e, field.id)}
              onDrop={(e) => handleDrop(e, field.id)}
            >
              {overId === field.id && dragId !== field.id ? <DropLine /> : null}
              {field.type === "page" ? (
                <PageBreakCard
                  field={field}
                  pageNumber={numbering.get(field.id)}
                  selected={selectedId === field.id}
                  sources={sources}
                  onSelect={onSelect}
                  onChange={onFieldChange}
                  onDelete={onDelete}
                  onDragHandleStart={onDragHandleStart}
                  onDragEnd={resetDrag}
                  dragging={dragId === field.id}
                />
              ) : (
                <FieldCard
                  field={field}
                  number={numbering.get(field.id)}
                  selected={selectedId === field.id}
                  sources={sources}
                  allFields={field.type === "calculated" && selectedId === field.id ? fields : undefined}
                  scoring={scoring}
                  quiz={quiz}
                  currency={currency}
                  onSelect={onSelect}
                  onChange={onFieldChange}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onToggleIncluded={onToggleIncluded}
                  onDragHandleStart={onDragHandleStart}
                  onDragEnd={resetDrag}
                  dragging={dragId === field.id}
                />
              )}
            </div>
          ))}

          {visible.length > 0 ? (
            <div className="relative h-10" onDragOver={(e) => handleDragOver(e, "__end__")} onDrop={(e) => handleDrop(e, null)}>
              {overId === "__end__" ? <DropLine /> : null}
            </div>
          ) : null}

          <ResizeHandle onMouseDown={startResize} />
        </div>

        <div className={cn("flex flex-wrap justify-center gap-2", visible.length ? "mt-2" : "mt-6")}>
          <Popover open={paletteOpen} onOpenChange={setPaletteOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5 bg-surface-subtle"><Plus className="h-3.5 w-3.5" />Add field</Button>
            </PopoverTrigger>
            <PopoverContent align="center" side="top" className="max-h-[60vh] w-[420px] overflow-y-auto p-3">
              <FieldPalette onPick={pick} autoFocus columns={3} />
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" size="sm" onClick={() => onInsert("calculated", { afterId: selectedId })} className="gap-1.5 bg-surface-subtle">
            <FunctionSquare className="h-3.5 w-3.5" />Calculated
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onInsert("page", { afterId: selectedId })} className="gap-1.5 bg-surface-subtle">
            <SplitSquareVertical className="h-3.5 w-3.5" />Add page
          </Button>
        </div>
      </div>
    </section>
  );
}
