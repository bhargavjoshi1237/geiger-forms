"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@geiger/ui/button";
import { Avatar, AvatarFallback } from "@geiger/ui/avatar";
import { Badge } from "@geiger/ui/badge";
import { StatusPill } from "@geiger/ui/screen-kit";
import { AssigneePicker, PersonChip, assigneeValue } from "@/components/forms/response/members";
import { resolvePerson } from "@/lib/hooks/use-members";
import {
  RESPONSE_PRIORITY_MAP,
  RESPONSE_STATUSES,
  STATUS_BAR_CLASS,
} from "./constants";

const DRAG_TYPE = "application/x-geiger-response";

// The card body opens the response; the footer's assignee button reassigns it in place (read-only without `onAssign`).
function KanbanCard({ r, showForm, people, onOpen, onAssign, onDragStart, onDragEnd, dragging }) {
  const person = resolvePerson(r.assigneeId, r.assignee, people.byId);
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, r)}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-lg border border-border bg-surface-card transition-colors hover:border-border-strong hover:bg-surface-hover active:cursor-grabbing",
        dragging && "opacity-40",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpen(r)}
        className="h-auto w-full cursor-[inherit] flex-col items-stretch justify-start gap-0 whitespace-normal rounded-b-none p-3 pb-2 text-left font-normal hover:bg-transparent"
      >
        <div className="flex items-center gap-2">
          <Avatar size="sm" className="border border-border">
            <AvatarFallback className="border-0 bg-surface-subtle text-[10px] font-semibold text-muted-foreground">{r.initials}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{r.name}</span>
          {r.score != null ? <Badge variant="neutral" className="tabular-nums" title="Score">{r.score}</Badge> : null}
        </div>
        {showForm ? <p className="mt-1.5 truncate text-xs text-text-tertiary">{r.form}</p> : null}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <StatusPill status={r.priority} map={RESPONSE_PRIORITY_MAP} />
          {(r.tags || []).slice(0, 2).map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
          {(r.tags || []).length > 2 ? <Badge variant="outline" className="text-text-tertiary">+{r.tags.length - 2}</Badge> : null}
        </div>
      </Button>
      <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5 text-xs text-text-tertiary">
        {onAssign ? (
          <AssigneePicker value={assigneeValue(r)} members={people.members} me={people.me} onChange={(member) => onAssign(r, member)}>
            <Button type="button" variant="ghost" size="xs" aria-label={`Change assignee for ${r.name}, currently ${person ? person.name : "unassigned"}`} className="min-w-0 max-w-[70%] justify-start px-1.5 font-normal text-text-secondary hover:bg-surface-active hover:text-foreground">
              <PersonChip person={person} />
            </Button>
          </AssigneePicker>
        ) : (
          <PersonChip person={person} className={cn("max-w-[70%] px-1.5", person && "text-text-secondary")} />
        )}
        <span className="shrink-0 pr-1.5">{r.received}</span>
      </div>
    </div>
  );
}

// Status columns; dropping a card into another column changes its status. `people` is the useMembers() directory.
export function KanbanBoard({ rows, showForm, people, onOpen, onMove, onAssign, statuses = RESPONSE_STATUSES }) {
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
                    people={people}
                    onOpen={onOpen}
                    onAssign={onAssign}
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
