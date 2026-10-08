"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { FileText, FunctionSquare, ImageIcon, MousePointerClick, Plus, SplitSquareVertical } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@geiger/ui/popover";
import { Textarea } from "@geiger/ui/textarea";
import { cn } from "@/lib/utils";
import { isInputField } from "@/lib/forms/field-types";
import { coverBackground } from "./cover-presets";
import { CoverPicker } from "./cover-picker";
import { FieldCard } from "./field-card";
import { FieldPalette, PALETTE_MIME } from "./field-palette";
import { PageBreakCard } from "./page-break-card";

const MIN_WIDTH = 480;
const MAX_WIDTH = 820;

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

const IntroCard = memo(function IntroCard({ title, description, showIcon, logoUrl, onTitleChange, onDescriptionChange, onResize }) {
  return (
    <div className="relative rounded-xl border border-border bg-card p-6 shadow-sm">
      {showIcon ? (
        logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied external logo URL
          <img src={logoUrl} alt="" className="mb-4 h-12 w-12 rounded-lg border border-border object-cover" />
        ) : (
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-lg border border-border bg-surface-subtle text-text-secondary"><FileText className="h-5 w-5" /></span>
        )
      ) : null}
      <Input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Form title"
        placeholder="Untitled form"
        className="h-11 border-transparent bg-transparent px-0 text-[26px] font-semibold leading-tight text-foreground shadow-none focus-visible:ring-0"
      />
      <Textarea
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        aria-label="Form description"
        placeholder="Add a description respondents will see above the questions…"
        className="mt-3 min-h-20 resize-none border-border bg-surface-card text-[13px] leading-5 text-muted-foreground"
      />
      <ResizeHandle onMouseDown={onResize} />
    </div>
  );
});

// The editable form canvas: cover, intro, field/page cards with drag-and-drop, and insert actions.
export function BuilderCanvas({
  doc,
  selectedId,
  sources,
  scoring,
  quiz,
  currency,
  onTitleChange,
  onDescriptionChange,
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
    <section className="relative min-h-full pb-16">
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

      <div className={cn("mx-auto w-full px-10", settings.coverStyle === "cover" ? "-mt-[66px]" : "mt-6")} style={{ maxWidth: `${canvasWidth + 80}px` }}>
        <IntroCard
          title={doc.title}
          description={doc.description}
          showIcon={settings.showIcon}
          logoUrl={settings.logoUrl}
          onTitleChange={onTitleChange}
          onDescriptionChange={onDescriptionChange}
          onResize={startResize}
        />

        <div className="mt-5 space-y-4" onDragLeave={handleLeave}>
          {hasPages ? (
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
              <SplitSquareVertical className="h-3.5 w-3.5" />Page 1
            </div>
          ) : null}

          {visible.length === 0 ? (
            <div
              onDragOver={(e) => handleDragOver(e, "__end__")}
              onDrop={(e) => handleDrop(e, null)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
                overId === "__end__" ? "border-sky-400 bg-sky-500/5" : "border-border bg-surface-subtle",
              )}
            >
              <MousePointerClick className="h-6 w-6 text-text-tertiary" />
              <p className="text-sm font-medium text-foreground">Start building your form</p>
              <p className="max-w-xs text-xs text-text-secondary">Drag a field type from the sidebar, or use “Add field” below.</p>
            </div>
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
        </div>

        <div className="mt-2 flex flex-wrap justify-center gap-2">
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
