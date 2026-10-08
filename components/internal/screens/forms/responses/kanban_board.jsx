"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@geiger/ui/button";
import { StatusPill } from "@geiger/ui/screen-kit";
import {
  RESPONSE_PRIORITY_MAP,
  RESPONSE_STATUSES,
  STATUS_BAR_CLASS,
  avatarColor,
} from "./constants";

const DRAG_TYPE = "application/x-geiger-response";

function KanbanCard({ r, showForm, onOpen, onDragStart, onDragEnd, dragging }) {
  return (
    <Button
      type="button"
      variant="outline"
      draggable
      onDragStart={(e) => onDragStart(e, r)}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(r)}
      className={cn(
        "h-auto w-full cursor-grab flex-col items-stretch justify-start gap-0 whitespace-normal rounded-lg bg-surface-card p-3 text-left font-normal shadow-none hover:border-border-strong hover:bg-surface-hover active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-muted-foreground", avatarColor(r.email || r.id))}>
          {r.initials}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{r.name}</span>
        {r.score != null ? <span className="rounded bg-surface-subtle px-1 text-[10px] tabular-nums text-muted-foreground">{r.score}</span> : null}
      </div>
      {showForm ? <p className="mt-1.5 truncate text-[11px] text-text-tertiary">{r.form}</p> : null}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <StatusPill status={r.priority} map={RESPONSE_PRIORITY_MAP} />
        {(r.tags || []).slice(0, 2).map((t) => (
          <span key={t} className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-text-secondary">{t}</span>
        ))}
        {(r.tags || []).length > 2 ? <span className="text-[10px] text-text-tertiary">+{r.tags.length - 2}</span> : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-text-tertiary">
        <span className="truncate">{r.assignee || "Unassigned"}</span>
        <span className="shrink-0">{r.received}</span>
      </div>
    </Button>
  );
}

// Status columns; dropping a card into another column changes its status.
export function KanbanBoard({ rows, showForm, onOpen, onMove, statuses = RESPONSE_STATUSES }) {
  const [draggingId, setDraggingId] = useState(null);
  const [overStatus, setOverStatus] = useState(null);

  const onDragStart = (e, r) => {
    e.dataTransfer.setData(DRAG_TYPE, r.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(r.id);
  };

  const onDrop = (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData(DRAG_TYPE);
    setOverStatus(null);
    setDraggingId(null);
    const row = rows.find((r) => r.id === id);
    if (row && row.status !== status) onMove(row, status);
  };

  return (
    <div className="scrollbar-subtle -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {statuses.map((status) => {
        const items = rows.filter((r) => r.status === status);
        return (
          <section
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              if (overStatus !== status) setOverStatus(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverStatus(null);
            }}
            onDrop={(e) => onDrop(e, status)}
            className={cn(
              "flex w-72 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface-subtle transition-colors",
              overStatus === status && "border-border-strong bg-surface-card",
            )}
            aria-label={`${status} column`}
          >
            <div className={cn("h-0.5", STATUS_BAR_CLASS[status] || "bg-border")} />
            <header className="flex items-center justify-between px-3 py-2.5">
              <span className="text-xs font-medium text-foreground">{status}</span>
              <span className="rounded-full bg-surface-card px-1.5 text-[10px] tabular-nums text-text-secondary">{items.length}</span>
            </header>
            <div className="scrollbar-subtle flex max-h-[60vh] min-h-24 flex-col gap-2 overflow-y-auto px-2 pb-2">
              {items.length ? (
                items.map((r) => (
                  <KanbanCard
                    key={r.id}
                    r={r}
                    showForm={showForm}
                    onOpen={onOpen}
                    onDragStart={onDragStart}
                    onDragEnd={() => setDraggingId(null)}
                    dragging={draggingId === r.id}
                  />
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-[11px] text-text-tertiary">Drop responses here</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
