"use client";

import { createElement, useMemo } from "react";
import { AlertTriangle, CornerDownRight, Flag, GitFork, Goal, SplitSquareVertical } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { getFieldIcon } from "@/lib/forms/field-types";
import { buildLogicMap } from "@/lib/forms/logic-map";
import { cn } from "@/lib/utils";

const ROW = 44;
const GUTTER = 72;
const ARC_STYLE = {
  jump: { stroke: "var(--primary)", width: 1.5, dash: undefined, marker: "url(#gf-map-jump)" },
  condition: { stroke: "var(--border-strong)", width: 1, dash: "3 3", marker: undefined },
  outcome: { stroke: "var(--border-strong)", width: 1, dash: "1 3", marker: undefined },
};
const NOTE = {
  jump: { variant: "info", icon: CornerDownRight },
  condition: { variant: "outline", icon: GitFork },
  outcome: { variant: "purple", icon: Goal },
  broken: { variant: "danger", icon: AlertTriangle },
};

function RowIcon({ row }) {
  const className = "h-3.5 w-3.5";
  if (row.kind === "page") return <SplitSquareVertical className={className} aria-hidden="true" />;
  if (row.kind === "end") return <Flag className={className} aria-hidden="true" />;
  if (row.kind === "outcome") return <Goal className={className} aria-hidden="true" />;
  return createElement(getFieldIcon(row.type), { className, "aria-hidden": true });
}

// Forward arcs only ever span rows, so a wider span bows further out into the gutter.
function arcPath(fromIndex, toIndex) {
  const y1 = fromIndex * ROW + ROW / 2;
  const y2 = toIndex * ROW + ROW / 2;
  const bow = Math.min(GUTTER - 16, 14 + Math.abs(toIndex - fromIndex) * 7);
  return `M ${GUTTER - 4} ${y1} C ${GUTTER - 4 - bow} ${y1}, ${GUTTER - 4 - bow} ${y2}, ${GUTTER - 4} ${y2}`;
}

// The form as a column of rows with its rules drawn beside them; every rule is also written on its row, so the drawing is decorative.
export function LogicMap({ fields, settings, onOpenField }) {
  const { rows, arcs } = useMemo(() => buildLogicMap(fields, settings), [fields, settings]);
  const index = new Map(rows.map((r, i) => [r.id, i]));
  const drawn = arcs.filter((a) => index.has(a.from) && index.has(a.to));

  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-0 top-0" width={GUTTER} height={rows.length * ROW} aria-hidden="true">
        <defs>
          <marker id="gf-map-jump" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="var(--primary)" />
          </marker>
        </defs>
        {drawn.map((arc) => {
          const style = ARC_STYLE[arc.kind];
          return <path key={`${arc.kind}-${arc.from}-${arc.to}`} d={arcPath(index.get(arc.from), index.get(arc.to))} fill="none" stroke={style.stroke} strokeWidth={style.width} strokeDasharray={style.dash} markerEnd={style.marker} />;
        })}
      </svg>
      <ol style={{ paddingInlineStart: GUTTER }}>
        {rows.map((row) => {
          const clickable = row.kind === "field" || row.kind === "page";
          const body = (
            <>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface-card text-text-secondary">
                <RowIcon row={row} />
              </span>
              <span className={cn("min-w-0 truncate text-sm", row.kind === "field" ? "text-foreground" : "font-medium text-text-secondary")}>{row.title}</span>
              <span className="ml-auto hidden min-w-0 items-center justify-end gap-1 overflow-hidden sm:flex">
                {row.notes.map((note) => {
                  const { variant, icon: Icon } = NOTE[note.kind];
                  return (
                    <Badge key={note.text} variant={variant} className="max-w-56 truncate" title={note.text}>
                      <Icon />
                      <span className="truncate">{note.text}</span>
                    </Badge>
                  );
                })}
              </span>
              {row.notes.length ? <span className="sr-only sm:hidden">{row.notes.map((n) => n.text).join(". ")}</span> : null}
            </>
          );
          return (
            <li key={row.id} style={{ height: ROW }} className="flex items-center border-b border-border last:border-b-0">
              {clickable ? (
                <Button type="button" variant="ghost" onClick={() => onOpenField?.(row.id)} aria-label={`Edit ${row.title} in the builder${row.notes.length ? `. ${row.notes.map((n) => n.text).join(". ")}` : ""}`} className="h-full w-full justify-start gap-2.5 rounded-none px-2 font-normal">
                  {body}
                </Button>
              ) : (
                <div className="flex h-full w-full items-center gap-2.5 px-2">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
