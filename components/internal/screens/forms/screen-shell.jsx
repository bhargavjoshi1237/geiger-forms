import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function FormsScreenShell({ eyebrow, title, description, action, actionHref, stats = [], children }) {
  return (
    <div className="mx-auto flex w-full flex-col gap-8 px-2 py-4 text-foreground lg:max-w-[85%] lg:px-0">
      <div className="flex flex-col gap-4 border-b border-border pb-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-secondary">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>

        <div className="flex shrink-0 flex-col gap-4 xl:items-end">
          {stats.length ? (
            <div className="flex gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1 xl:items-end">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">{stat.label}</span>
                  <span className="text-base font-medium w-full text-center text-white">{stat.value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {action && actionHref ? (
            <Button asChild type="button" className="w-fit shrink-0 rounded-lg bg-[#e7e7e7] px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
              <Link href={actionHref}>{action}</Link>
            </Button>
          ) : action ? (
            <Button type="button" className="w-fit shrink-0 rounded-lg bg-[#e7e7e7] px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">
              {action}
            </Button>
          ) : null}
        </div>
      </div>

      {children}
    </div>
  );
}

export function MetricCard({ label, value, detail, Icon }) {
  return (
    <div className="min-w-28">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="h-3 w-3 shrink-0 text-text-tertiary" /> : null}
        <p className="truncate text-[10px] font-medium uppercase text-text-secondary">{label}</p>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-base font-semibold leading-none text-white">{value}</p>
        <p className="truncate text-[11px] text-text-secondary">{detail}</p>
      </div>
    </div>
  );
}

export function DataPanel({ title, description, children, className }) {
  return (
    <section className={cn("rounded-md border border-border bg-surface-subtle", className)}>
      {title || description ? (
        <div className="border-b border-border p-4">
          {title ? <h2 className="text-sm font-medium text-white">{title}</h2> : null}
          {description ? <p className="mt-1 text-xs text-text-secondary">{description}</p> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EmptyState({ Icon, title, description }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-card p-8 text-center">
      {Icon ? <Icon className="mb-3 h-6 w-6 text-text-tertiary" /> : null}
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-text-secondary">{description}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-border bg-surface-subtle p-8 text-center">
      <Loader2 className="mb-3 h-5 w-5 animate-spin text-text-secondary" />
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, onRetry }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-[#7c2d12] bg-[#1a1207] p-8 text-center">
      <AlertTriangle className="mb-3 h-6 w-6 text-[#fb923c]" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-xs leading-5 text-muted-foreground">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function SimpleTable({ columns, rows }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow key={`${row.join("|")}-${rowIndex}`} className="bg-surface-subtle text-muted-foreground">
              {row.map((cell, cellIndex) => (
                <TableCell key={`${rowIndex}-${cellIndex}`}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
