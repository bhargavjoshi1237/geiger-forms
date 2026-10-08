"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeDollarSign,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Flame,
  Gauge,
  Inbox,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Sector,
  XAxis,
} from "recharts";

import { Button } from "@geiger/ui/button";
import { Card, CardContent } from "@geiger/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@geiger/ui/chart";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@geiger/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { EmptyState, RollingNumber, StatsBar, StatusPill } from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { useForms } from "@/lib/hooks/use-forms";
import { useResponses } from "@/lib/hooks/use-responses";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { listFormEvents } from "@/lib/supabase/responses";
import { cn } from "@/lib/utils";
import { FORM_STATUS_MAP, formatCount } from "../forms/constants";
import { STATUS_CHART_COLORS } from "../responses/constants";

const DAY = 86_400_000;
const WEEKS = 12;

// Suite chart palette (--chart-1…5) with views/starts matching the Analytics screen; statuses reuse the Responses palette.
const CHART_COLORS = {
  views: "var(--chart-1)",
  submits: "var(--chart-2)",
  starts: "var(--chart-3)",
  resolved: "var(--chart-4)",
  appBackground: "var(--background)",
  grid: "var(--border)",
};
const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

const FALLBACK_STATUS_COLOR = "var(--color-neutral-500)";
const RESOLVED_STATUSES = new Set(["Complete", "Approved", "Rejected", "Spam"]);

const TREND_METRIC_OPTIONS = [
  { value: "submissions", label: "Submissions", color: CHART_COLORS.submits },
  { value: "starts", label: "Starts", color: CHART_COLORS.starts },
  { value: "views", label: "Views", color: CHART_COLORS.views },
];

const TOP_FORMS_SORT_OPTIONS = [
  { value: "responses", label: "Responses" },
  { value: "completion", label: "Completion" },
];

const MOMENTUM_META = {
  rising: { label: "Rising", icon: Flame, className: "text-emerald-300" },
  steady: { label: "Steady", icon: TrendingUp, className: "text-sky-300" },
  quiet: { label: "Quiet", icon: TrendingDown, className: "text-amber-300" },
  offline: { label: "Not live", icon: Clock, className: "text-text-secondary" },
};

const URGENCY_ORDER = ["urgent", "soon", "routine"];
const URGENCY_LABELS = { urgent: "Urgent", soon: "Soon", routine: "Routine" };

function startOfWeek(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function buildWeeklyBuckets(now, weeks) {
  const end = startOfWeek(now);
  return Array.from({ length: weeks }, (_, i) => {
    const start = new Date(end);
    start.setDate(start.getDate() - (weeks - 1 - i) * 7);
    return start;
  });
}

function addToBucket(totals, buckets, iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (t >= buckets[i].getTime()) {
      totals[i] += 1;
      return;
    }
  }
}

function countInWindow(rows, dateKey, from, to, predicate = () => true) {
  let total = 0;
  for (const row of rows) {
    const t = new Date(row[dateKey]).getTime();
    if (Number.isFinite(t) && t >= from && t < to && predicate(row)) total += 1;
  }
  return total;
}

function periodDelta(current, previous) {
  if (previous <= 0) return { delta: null, trend: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { delta: `${pct >= 0 ? "+" : ""}${pct}%`, trend: pct >= 0 ? "up" : "down" };
}

function percent(part, whole) {
  return whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;
}

function formatDuration(ms) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function filterByScope(rows, scope, key = "formId") {
  return scope.length ? rows.filter((r) => scope.includes(r[key])) : rows;
}

function WidgetShell({ children, className, contentClassName }) {
  return (
    <Card className={cn("h-full gap-0 overflow-hidden rounded-xl border-border bg-surface-subtle py-0 text-foreground", className)}>
      <CardContent className={cn("h-full p-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

function WidgetHeader({ title, subtitle, action }) {
  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

function FormScopeSelect({ forms, selected, onChange }) {
  const all = selected.length === 0;
  const clip = (s) => (s.length > 5 ? `${s.slice(0, 5)}…` : s);
  const label = all
    ? "All"
    : selected.length === 1
      ? clip(forms.find((f) => f.id === selected[0])?.name || "1 form")
      : `${selected.length} forms`;
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 gap-2 border-border bg-surface-card text-foreground hover:bg-surface-active"
          disabled={!forms.length}
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{label}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto border-border bg-surface-subtle">
        <DropdownMenuCheckboxItem checked={all} onCheckedChange={() => onChange([])} onSelect={(e) => e.preventDefault()}>
          All Forms
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator className="bg-border" />
        {forms.map((form) => (
          <DropdownMenuCheckboxItem
            key={form.id}
            checked={selected.includes(form.id)}
            onCheckedChange={() => toggle(form.id)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="truncate">{form.name || "Untitled form"}</span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ResponsesTrendWidget({ pending, forms, responses, events, now }) {
  const [metric, setMetric] = useState("submissions");
  const [scope, setScope] = useState([]);
  const selected = TREND_METRIC_OPTIONS.find((o) => o.value === metric) || TREND_METRIC_OPTIONS[0];

  const weeks = useMemo(() => buildWeeklyBuckets(now, WEEKS), [now]);
  const scopedResponses = useMemo(() => filterByScope(responses, scope), [responses, scope]);
  const scopedEvents = useMemo(() => filterByScope(events, scope), [events, scope]);
  const hasLiveData = scopedResponses.length > 0 || scopedEvents.length > 0;

  const data = useMemo(() => {
    const totals = weeks.map(() => 0);
    if (metric === "submissions") for (const r of scopedResponses) addToBucket(totals, weeks, r.submittedAt);
    else {
      const type = metric === "starts" ? "start" : "view";
      for (const e of scopedEvents) if (e.type === type) addToBucket(totals, weeks, e.createdAt);
    }
    return totals.map((value, i) => ({
      label: weeks[i].toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    }));
  }, [metric, scopedResponses, scopedEvents, weeks]);

  const header = (
    <WidgetHeader
      title="Responses Over Time"
      subtitle={`${selected.label} per week across your forms.`}
      action={
        <div className="flex items-center gap-2">
          <FormScopeSelect forms={forms} selected={scope} onChange={setScope} />
          <FilterDropdown value={metric} onValueChange={setMetric} options={TREND_METRIC_OPTIONS} height="h-9" />
        </div>
      }
    />
  );

  // Mid-fetch the series is all zeros, so the line sits on the baseline and animates up when data lands.
  if (!pending && !hasLiveData) {
    return (
      <WidgetShell contentClassName="flex flex-col">
        {header}
        <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
          <EmptyState
            icon={TrendingUp}
            title="No activity yet"
            description="Views, starts and submissions will show up here once people open your forms."
          />
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell contentClassName="flex flex-col">
      {header}
      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
        <ChartContainer config={{ value: { label: selected.label, color: selected.color } }} className="mx-auto h-full w-full">
          <LineChart data={data} margin={{ top: 24, right: 16, left: 12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  hideLabel
                  formatter={(value) => <span className="font-medium tabular-nums text-foreground">{formatCount(value)}</span>}
                />
              }
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke={selected.color}
              strokeWidth={2}
              dot={{ fill: selected.color, r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive
            >
              <LabelList dataKey="value" position="top" offset={10} className="fill-foreground" fontSize={11} formatter={formatCount} />
            </Line>
          </LineChart>
        </ChartContainer>
      </div>
    </WidgetShell>
  );
}

function StatusMixWidget({ pending, responses }) {
  const mix = useMemo(() => {
    const counts = new Map();
    for (const r of responses) counts.set(r.status, (counts.get(r.status) || 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([status, value]) => ({ key: status, label: status, value, fill: STATUS_CHART_COLORS[status] || FALLBACK_STATUS_COLOR }));
  }, [responses]);

  const [selectedStatus, setSelectedStatus] = useState(null);
  const activeStatus = mix.some((item) => item.key === selectedStatus) ? selectedStatus : mix[0]?.key ?? null;
  const total = mix.reduce((sum, item) => sum + item.value, 0);
  const selectedIndex = Math.max(mix.findIndex((item) => item.key === activeStatus), 0);
  const selectedItem = mix[selectedIndex];
  const chartConfig = Object.fromEntries(mix.map((item) => [item.key, { label: item.label, color: item.fill }]));
  const header = <WidgetHeader title="Response Status Mix" subtitle="Triage state across every response." />;

  // A donut has no zero shape, so mid-fetch it holds an empty ring on the chart's geometry.
  if (pending && !mix.length) {
    return (
      <WidgetShell contentClassName="flex flex-col">
        {header}
        <div className="relative mt-4 flex min-h-0 w-full flex-1 items-center justify-center">
          <div className="h-[156px] w-[156px] rounded-full border-[34px] border-border" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <span className="text-3xl font-bold leading-none text-foreground">0</span>
            <span className="mt-1 text-xs font-medium text-muted-foreground">0% share</span>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-text-secondary">0 of 0 responses</p>
      </WidgetShell>
    );
  }

  if (!mix.length) {
    return (
      <WidgetShell contentClassName="flex flex-col">
        {header}
        <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
          <EmptyState icon={Inbox} title="No responses yet" description="Share a published form to start collecting responses." />
        </div>
      </WidgetShell>
    );
  }

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader
        title="Response Status Mix"
        subtitle="Triage state across every response."
        action={
          <FilterDropdown
            value={activeStatus}
            onValueChange={setSelectedStatus}
            options={mix.map((item) => ({ value: item.key, label: item.label }))}
            height="h-9"
          />
        }
      />
      <div className="relative mt-4 flex min-h-0 w-full flex-1 items-center justify-center">
        <ChartContainer config={chartConfig} className="mx-auto h-[220px] w-[220px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie
              data={mix}
              dataKey="value"
              nameKey="key"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={78}
              // recharts 3 dropped activeIndex; pop the selected slice out via the sector shape instead.
              shape={({ key, ...props }) => <Sector key={key} {...props} outerRadius={props.index === selectedIndex ? 88 : props.outerRadius} />}
              stroke={CHART_COLORS.appBackground}
              strokeWidth={2}
              isAnimationActive
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="text-3xl font-bold leading-none text-foreground">{formatCount(selectedItem?.value)}</span>
          <span className="mt-1 text-xs font-medium text-muted-foreground">{percent(selectedItem?.value || 0, total)}% share</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-text-secondary">
        {formatCount(selectedItem?.value)} of {formatCount(total)} responses are {selectedItem?.label.toLowerCase()}
      </p>
    </WidgetShell>
  );
}

function CompletionFunnelWidget({ views, starts, submits }) {
  const stages = [
    { key: "views", label: "Form views", short: "Viewed", value: views },
    { key: "starts", label: "Started filling", short: "Started", value: starts },
    { key: "submits", label: "Submitted", short: "Submitted", value: submits },
  ];
  const top = views || 0;
  const chartData = stages.map((stage) => ({ ...stage, share: percent(stage.value, top) }));

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader
        title="Completion Funnel"
        subtitle="Share of views reaching each step, from opening to submitting."
        action={
          <div className="flex shrink-0 flex-col items-end">
            <span className="text-3xl font-bold leading-none text-foreground">{percent(submits, top)}%</span>
            <span className="mt-1 text-[11px] text-text-secondary">view → submit</span>
          </div>
        }
      />
      <div className="mt-1 flex min-h-0 flex-1 items-center justify-center">
        <ChartContainer config={{ share: { label: "Share of views", color: CHART_COLORS.views } }} className="mx-auto aspect-square h-full max-h-[210px]">
          <RadarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="key"
                  formatter={(value, name, item) => (
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">{item.payload.label}</span>
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCount(item.payload.value)} · {item.payload.share}%
                      </span>
                    </span>
                  )}
                />
              }
            />
            <PolarGrid stroke={CHART_COLORS.grid} />
            <PolarAngleAxis dataKey="short" tick={AXIS_TICK} />
            <Radar
              dataKey="share"
              stroke={CHART_COLORS.views}
              strokeWidth={2}
              fill={CHART_COLORS.views}
              fillOpacity={0.5}
              dot={{ r: 4, fill: CHART_COLORS.views, fillOpacity: 1, stroke: CHART_COLORS.appBackground, strokeWidth: 1.5 }}
              isAnimationActive
            />
          </RadarChart>
        </ChartContainer>
      </div>
    </WidgetShell>
  );
}

function GaugeWidget({ title, subtitle, caption, color, forms, computeLive }) {
  const [scope, setScope] = useState([]);
  const { pct, footnote } = useMemo(() => computeLive(scope), [computeLive, scope]);
  const clamped = Math.max(0, Math.min(100, pct));
  const data = [{ name: caption, value: clamped, fill: color }];

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader title={title} subtitle={subtitle} action={<FormScopeSelect forms={forms} selected={scope} onChange={setScope} />} />
      <div className="mt-1 flex min-h-0 flex-1 items-center justify-center">
        <ChartContainer config={{ value: { label: caption, color } }} className="mx-auto aspect-square h-full max-h-[190px]">
          <RadialBarChart data={data} startAngle={90} endAngle={90 - (clamped / 100) * 360} innerRadius={58} outerRadius={84}>
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              polarRadius={[63, 53]}
              className="first:fill-surface-hover last:fill-surface-card"
            />
            <RadialBar dataKey="value" cornerRadius={8} isAnimationActive />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                      <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-3xl font-bold">
                        {clamped}%
                      </tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 22} className="fill-muted-foreground text-xs font-medium">
                        {caption}
                      </tspan>
                    </text>
                  );
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </div>
      {footnote ? <p className="mt-1 text-center text-xs text-text-secondary">{footnote}</p> : null}
    </WidgetShell>
  );
}

function TopFormsTable({ pending, forms, responses, events, now }) {
  const [sortBy, setSortBy] = useState("responses");
  const [scope, setScope] = useState([]);
  const { openForm } = useWorkspaceUrl();

  const rows = useMemo(() => {
    const stats = new Map(forms.map((f) => [f.id, { recent: 0, week: 0, prevWeek: 0, starts: 0, submits: 0 }]));
    for (const r of responses) {
      const s = stats.get(r.formId);
      const t = new Date(r.submittedAt).getTime();
      if (!s || !Number.isFinite(t)) continue;
      if (t >= now - 30 * DAY) s.recent += 1;
      if (t >= now - 7 * DAY) s.week += 1;
      else if (t >= now - 14 * DAY) s.prevWeek += 1;
    }
    for (const e of events) {
      const s = stats.get(e.formId);
      if (!s || new Date(e.createdAt).getTime() < now - 30 * DAY) continue;
      if (e.type === "start") s.starts += 1;
      if (e.type === "submit") s.submits += 1;
    }
    return filterByScope(forms, scope, "id")
      .filter((f) => f.status !== "Archived")
      .map((f) => {
        const s = stats.get(f.id);
        const momentum =
          f.status !== "Published" ? "offline" : s.week > s.prevWeek ? "rising" : s.week > 0 ? "steady" : "quiet";
        return { ...f, ...s, completion: s.starts ? percent(s.submits, s.starts) : null, momentum };
      });
  }, [forms, responses, events, scope, now]);

  const sorted = [...rows]
    .sort((a, b) =>
      sortBy === "responses"
        ? b.recent - a.recent || b.responses - a.responses
        : (b.completion ?? -1) - (a.completion ?? -1),
    )
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WidgetHeader title="Top Performing Forms" subtitle="Ranked by responses and completion over the last 30 days." />
        <div className="flex items-center gap-2">
          <FormScopeSelect forms={forms} selected={scope} onChange={setScope} />
          <FilterDropdown value={sortBy} onValueChange={setSortBy} options={TOP_FORMS_SORT_OPTIONS} height="h-9" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        {/* Mid-fetch the table keeps its header and no rows rather than declaring there are no forms. */}
        {sorted.length === 0 && !pending ? (
          <EmptyState icon={FileText} title="No forms yet" description="Create a form to see it ranked here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border">
                <TableHead>Form</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[180px]">Completion</TableHead>
                <TableHead className="text-right">Responses (30d)</TableHead>
                <TableHead>Momentum</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((form) => {
                const meta = MOMENTUM_META[form.momentum];
                const MomentumIcon = meta.icon;
                return (
                  <TableRow key={form.id} className="border-border">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">{form.name || "Untitled form"}</span>
                        <p className="text-xs text-text-secondary">{formatCount(form.responses)} responses all time</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusPill status={form.status} map={FORM_STATUS_MAP} />
                    </TableCell>
                    <TableCell>
                      {form.completion == null ? (
                        <span className="text-xs text-text-tertiary">No starts yet</span>
                      ) : (
                        <div className="w-[140px] space-y-1.5">
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                            <div className="h-full rounded-full" style={{ width: `${form.completion}%`, background: CHART_COLORS.submits }} />
                          </div>
                          <p className="text-xs text-text-secondary">{form.completion}%</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-foreground">{formatCount(form.recent)}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1.5 font-medium", meta.className)}>
                        <MomentumIcon className="h-3.5 w-3.5" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Open ${form.name || "form"}`}
                        className="text-muted-foreground hover:bg-surface-active hover:text-foreground"
                        onClick={() => openForm(form.id)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function GeneralStatsCard({ items }) {
  const sorted = [...items].sort((a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency));

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader
        title="Overall Stats"
        subtitle="A quick snapshot of the work waiting across your forms."
        action={
          <span className="shrink-0 rounded-md border border-border bg-surface-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {items.length} Legends
          </span>
        }
      />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              onClick={item.onClick}
              className="group h-auto justify-start gap-3.5 whitespace-normal rounded-xl p-3.5 text-left font-normal hover:bg-surface-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
                <Icon className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{item.label}</span>
                  <span className="shrink-0 rounded-md border border-border bg-surface-card px-1.5 py-0.5 text-[10px] font-medium text-text-secondary">
                    {URGENCY_LABELS[item.urgency]}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-text-secondary">{item.hint}</p>
              </div>
              <span className="shrink-0 text-xl font-bold tabular-nums text-foreground">{formatCount(item.count)}</span>
              <ChevronRight className="size-3 shrink-0 text-text-secondary transition-colors group-hover:text-foreground" />
            </Button>
          );
        })}
      </div>
    </WidgetShell>
  );
}

function useOverviewData() {
  const { forms, loading: formsLoading, error: formsError } = useForms();
  const { responses, loading: responsesLoading, error: responsesError } = useResponses();
  const [events, setEvents] = useState(null);
  // Reference time for every window on the screen, fixed per mount.
  const [now] = useState(() => Date.now());
  const formKey = forms.map((f) => f.id).join(",");

  useEffect(() => {
    if (formsLoading || !formKey) return undefined;
    let alive = true;
    const since = buildWeeklyBuckets(now, WEEKS)[0].toISOString();
    listFormEvents({ formIds: formKey.split(","), since })
      .then((rows) => alive && setEvents(rows))
      .catch((err) => {
        console.error("[overview.events]", err);
        if (alive) setEvents([]);
      });
    return () => {
      alive = false;
    };
  }, [formKey, formsLoading, now]);

  // Like events: the layout never blocks on an error, it reports it and keeps the zero state.
  const error = formsError || responsesError;
  useEffect(() => {
    if (!error) return;
    console.error("[overview.load]", error);
    toast.error("Couldn't load the overview data.");
  }, [error]);

  const loading = formsLoading || responsesLoading;
  return {
    forms,
    responses,
    events: events ?? [],
    now,
    // Widgets that would otherwise say "nothing here" wait for every fetch to land first.
    pending: loading || (Boolean(formKey) && events === null),
  };
}

export function OverviewScreen() {
  const { forms, responses, events, now, pending } = useOverviewData();
  const { setView, openForm } = useWorkspaceUrl();

  const workspaceSummary = useMemo(
    () => [
      { label: "Forms", value: formatCount(forms.filter((f) => f.status !== "Archived").length) },
      { label: "Live", value: formatCount(forms.filter((f) => f.status === "Published").length) },
      { label: "Responses", value: formatCount(responses.length) },
    ],
    [forms, responses],
  );

  const stats = useMemo(() => {
    const cur0 = now - 30 * DAY;
    const prev0 = cur0 - 30 * DAY;
    const isType = (type) => (e) => e.type === type;

    const respCur = countInWindow(responses, "submittedAt", cur0, now + DAY);
    const respPrev = countInWindow(responses, "submittedAt", prev0, cur0);
    const viewCur = countInWindow(events, "createdAt", cur0, now + DAY, isType("view"));
    const viewPrev = countInWindow(events, "createdAt", prev0, cur0, isType("view"));
    const rate = (from, to) => {
      const starts = countInWindow(events, "createdAt", from, to, isType("start"));
      return starts ? percent(countInWindow(events, "createdAt", from, to, isType("submit")), starts) : 0;
    };
    const rateCur = rate(cur0, now + DAY);
    const ratePrev = rate(prev0, cur0);
    const timed = responses.filter((r) => r.completionMs > 0 && new Date(r.submittedAt).getTime() >= cur0);
    const avgMs = timed.length ? timed.reduce((s, r) => s + r.completionMs, 0) / timed.length : 0;

    const respDelta = periodDelta(respCur, respPrev);
    const viewDelta = periodDelta(viewCur, viewPrev);
    const rateDelta = periodDelta(rateCur, ratePrev);

    return [
      { label: "New Responses", value: formatCount(respCur), delta: respDelta.delta, trend: respDelta.trend, footer: "VS Last Period" },
      { label: "Form Views", value: formatCount(viewCur), delta: viewDelta.delta, trend: viewDelta.trend, footer: "VS Last Period" },
      { label: "Completion Rate", value: `${rateCur}%`, delta: rateDelta.delta, trend: rateDelta.trend, footer: "VS Last Period" },
      { label: "Avg. Completion Time", value: formatDuration(avgMs), footer: "Last 30 Days" },
    ];
  }, [responses, events, now]);

  const funnel = useMemo(
    () => ({
      views: events.filter((e) => e.type === "view").length,
      starts: events.filter((e) => e.type === "start").length,
      submits: events.filter((e) => e.type === "submit").length,
    }),
    [events],
  );

  const completionCompute = useCallback(
    (scope) => {
      const scoped = filterByScope(events, scope);
      const starts = scoped.filter((e) => e.type === "start").length;
      const submits = scoped.filter((e) => e.type === "submit").length;
      return { pct: percent(submits, starts), footnote: `${formatCount(submits)} of ${formatCount(starts)} Starts Submitted` };
    },
    [events],
  );

  const resolvedCompute = useCallback(
    (scope) => {
      const scoped = filterByScope(responses, scope);
      const resolved = scoped.filter((r) => RESOLVED_STATUSES.has(r.status)).length;
      return { pct: percent(resolved, scoped.length), footnote: `${formatCount(resolved)} of ${formatCount(scoped.length)} Responses Handled` };
    },
    [responses],
  );

  const attentionItems = useMemo(() => {
    const count = (fn) => responses.filter(fn).length;
    const goResponses = () => setView("Responses");
    const goForms = () => setView("Forms");
    const published = forms.filter((f) => f.status === "Published");
    const closing = published.filter((f) => {
      const close = f.settings?.closeDate ? new Date(f.settings.closeDate).getTime() : null;
      return close && close >= now - DAY && close <= now + 7 * DAY;
    });
    const nearLimit = published.filter((f) => {
      const limit = Number(f.settings?.responseLimit) || 0;
      return limit && f.responses >= limit * 0.9;
    });
    const drafts = forms.filter((f) => f.status === "Draft");
    const openOne = (list, fallback) => () => (list.length === 1 ? openForm(list[0].id, "submission") : fallback());

    return [
      { key: "review", label: "Responses to review", hint: "Flagged for triage", count: count((r) => r.status === "Needs review"), icon: AlertCircle, urgency: "urgent", onClick: goResponses },
      { key: "approval", label: "Pending approval", hint: "Waiting on an approver", count: count((r) => r.approval?.state === "pending" || r.status === "Pending"), icon: ClipboardCheck, urgency: "urgent", onClick: goResponses },
      { key: "payment", label: "Awaiting payment", hint: "Checkout not completed", count: count((r) => r.status === "Awaiting payment"), icon: BadgeDollarSign, urgency: "soon", onClick: goResponses },
      { key: "closing", label: "Closing this week", hint: "Published forms with a close date", count: closing.length, icon: CalendarClock, urgency: "soon", onClick: openOne(closing, goForms) },
      { key: "limit", label: "Near response limit", hint: "Over 90% of the cap", count: nearLimit.length, icon: Gauge, urgency: "soon", onClick: openOne(nearLimit, goForms) },
      { key: "spam", label: "Marked as spam", hint: "Review or delete", count: count((r) => r.status === "Spam"), icon: ShieldAlert, urgency: "routine", onClick: goResponses },
      { key: "drafts", label: "Unpublished drafts", hint: "Ready to go live", count: drafts.length, icon: FileText, urgency: "routine", onClick: goForms },
    ];
  }, [responses, forms, setView, openForm, now]);

  // No skeleton (mirrors events): the page lays out at zero and fills in once the fetch lands.
  return (
    <MainScreenWrapper>
      <div className="mt-2">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-left">Forms Overview</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground md:text-left">
              Track views, responses, completion and the work waiting on your team across every form.
            </p>
          </div>
          <div className="flex w-full md:w-auto">
            {workspaceSummary.map((stat, i) => {
              const last = i === workspaceSummary.length - 1;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    "flex flex-1 flex-col items-center md:flex-none",
                    i === 0 && "md:pr-8",
                    i > 0 && "border-l border-border",
                    i > 0 && !last && "md:px-8",
                    last && i > 0 && "md:pl-8",
                  )}
                >
                  <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">{stat.label}</span>
                  <RollingNumber value={stat.value} className="mt-0.5 text-2xl font-bold text-foreground" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <StatsBar stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[360px] lg:col-span-2">
          <ResponsesTrendWidget pending={pending} forms={forms} responses={responses} events={events} now={now} />
        </div>
        <div className="h-[360px]">
          <StatusMixWidget pending={pending} responses={responses} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-[300px]">
          <CompletionFunnelWidget {...funnel} />
        </div>
        <div className="h-[300px]">
          <GaugeWidget
            title="Completion Rate"
            subtitle="Submitted vs. started."
            caption="Submitted"
            forms={forms}
            color={CHART_COLORS.submits}
            computeLive={completionCompute}
          />
        </div>
        <div className="h-[300px]">
          <GaugeWidget
            title="Resolution Rate"
            subtitle="Handled vs. all responses."
            caption="Handled"
            forms={forms}
            color={CHART_COLORS.resolved}
            computeLive={resolvedCompute}
          />
        </div>
      </div>

      <TopFormsTable pending={pending} forms={forms} responses={responses} events={events} now={now} />

      <GeneralStatsCard items={attentionItems} />
    </MainScreenWrapper>
  );
}

export default OverviewScreen;
