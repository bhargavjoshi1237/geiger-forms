"use client";

import { useEffect, useState } from "react";
import { Button } from "@geiger/ui/button";
import { Card, CardContent } from "@geiger/ui/card";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Download,
  FileText,
  Flame,
  Gauge,
  Plug,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@geiger/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@geiger/ui/table";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { cn } from "@/lib/utils";

// Monochrome accent for primary chart series — theme-aware (dark on light, light
// on dark) so the elegant single-color look survives light mode.
const ACCENT = "var(--foreground)";
// Status donut palette — matches the app's response-status colors (Complete →
// emerald, Needs review → orange, Pending → neutral) used across the responses screens.
const STATUS_SERIES_COLORS = ["#4ade80", "#fb923c", "#525252"];
// Theme-aware chart chrome (grid + axis).
const GRID_STROKE = "var(--border)";
const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

// --- Sample data (placeholder until backend is connected) --------------------

// Compact workspace summary shown beside the page title.
const WORKSPACE_SUMMARY = [
  { label: "Forms", value: "18" },
  { label: "Published", value: "11" },
  { label: "Responses", value: "4,206" },
];

const STATS = [
  { label: "Responses", value: "4,206", delta: "+9.8%", trend: "up", footer: "vs last period" },
  { label: "Completion Rate", value: "11%", delta: "+4.1%", trend: "up", footer: "vs last period" },
  { label: "Avg. Time to Complete", value: "2m 41s", delta: "-6.2%", trend: "up", footer: "faster than last period" },
  { label: "Needs Review", value: "63", delta: "+12.0%", trend: "down", footer: "vs last period" },
];

const TREND_SERIES = {
  submissions: [120, 168, 142, 205, 188, 240, 276, 262, 318, 356, 402, 468],
  completed: [82, 120, 104, 150, 138, 182, 210, 205, 248, 280, 320, 372],
  started: [180, 230, 210, 288, 265, 330, 372, 360, 420, 470, 520, 600],
};

const TREND_RANGE_OPTIONS = [
  { value: "submissions", label: "Submissions" },
  { value: "completed", label: "Completed" },
  { value: "started", label: "Started" },
];

// Triage state of every response collected in the period.
const STATUS_MIX = [
  { key: "complete", label: "Complete", value: 124 },
  { key: "review", label: "Needs review", value: 782 },
  { key: "pending", label: "Pending", value: 400 },
];

// Forms ranked by performance for the selected period.
const TOP_FORMS = [
  { name: "Customer Onboarding Survey", status: "Published", responses: 1284, completion: 88, momentum: "fast" },
  { name: "Bug Report Intake", status: "Published", responses: 962, completion: 74, momentum: "track" },
  { name: "Event RSVP — Q3 Summit", status: "Published", responses: 640, completion: 91, momentum: "fast" },
  { name: "Job Application — Design", status: "Draft", responses: 148, completion: 52, momentum: "slow" },
  { name: "Product Feedback (NPS)", status: "Published", responses: 420, completion: 66, momentum: "slow" },
];

const MOMENTUM_META = {
  fast: { label: "Filling fast", icon: Flame, className: "text-emerald-300" },
  track: { label: "On track", icon: TrendingUp, className: "text-sky-300" },
  slow: { label: "Slow", icon: TrendingDown, className: "text-amber-300" },
};

const FORM_STATUS_META = {
  Published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  Draft: "border-border bg-surface-card text-muted-foreground",
  Archived: "border-border bg-surface-card text-muted-foreground",
};

// Operational tasks waiting on the owner — the reason to open this screen.
const ATTENTION_ITEMS = [
  { key: "review", label: "Responses to review", hint: "Awaiting your triage", value: "63", cta: "Review", icon: AlertCircle, urgency: "urgent" },
  { key: "spam", label: "Flagged as spam", hint: "Across 4 forms", value: "17", cta: "Clean up", icon: ShieldAlert, urgency: "urgent" },
  { key: "capacity", label: "Forms near response limit", hint: "Over 90% of plan quota", value: "2", cta: "Manage", icon: Gauge, urgency: "soon" },
  { key: "integrations", label: "Integrations failing", hint: "Reconnect to resume delivery", value: "1", cta: "Fix", icon: Plug, urgency: "soon" },
  { key: "exports", label: "Exports ready", hint: "CSV bundles to download", value: "3", cta: "Download", icon: Download, urgency: "routine" },
  { key: "drafts", label: "Unpublished drafts", hint: "Ready to go live", value: "5", cta: "Publish", icon: FileText, urgency: "routine" },
];

const URGENCY_ORDER = ["urgent", "soon", "routine"];

const URGENCY_LABELS = { urgent: "Urgent", soon: "Soon", routine: "Routine" };

// --- Animated odometer (mirrors geiger-events RollingNumber) -----------------

const ROLL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function RollingDigit({ digit, active, delay }) {
  return (
    <span className="relative inline-block h-[1em] w-[1ch] overflow-hidden align-baseline">
      <span
        className="absolute inset-x-0 top-0 flex flex-col transition-transform duration-[900ms] ease-out"
        style={{ transform: `translateY(-${(active ? digit : 0) * 10}%)`, transitionDelay: `${delay}ms` }}
      >
        {ROLL_DIGITS.map((n) => (
          <span key={n} className="flex h-[1em] items-center justify-center leading-none">
            {n}
          </span>
        ))}
      </span>
    </span>
  );
}

function RollingNumber({ value, className }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const chars = String(value).split("");

  return (
    <span className={cn("inline-flex tabular-nums", className)}>
      {chars.map((char, i) => {
        if (/\d/.test(char)) {
          const digitIndex = chars.slice(0, i).filter((c) => /\d/.test(c)).length;
          return <RollingDigit key={i} digit={Number(char)} active={active} delay={digitIndex * 70} />;
        }
        return <span key={i}>{char}</span>;
      })}
    </span>
  );
}

// --- Summary stats bar (mirrors geiger-events StatsBar) ----------------------

function StatsBar({ stats }) {
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-border bg-surface-subtle py-0 text-foreground">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map((stat, i) => {
            const up = stat.trend === "up";
            const TrendIcon = up ? ArrowUpRight : ArrowDownRight;
            return (
              <div
                key={stat.label}
                className={cn(
                  "p-4",
                  i % 2 !== 0 && "border-l border-border",
                  i >= 2 && "border-t border-border",
                  "md:border-l md:border-border md:border-t-0",
                  i === 0 && "md:border-l-0",
                )}
              >
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                  {stat.label}
                </span>
                <div className="mt-1 flex items-end gap-2">
                  <RollingNumber value={stat.value} className="text-2xl font-bold leading-none text-foreground" />
                  {stat.delta ? (
                    <span
                      className={cn(
                        "mb-0.5 inline-flex items-center gap-0.5 text-xs font-medium",
                        up ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      <TrendIcon className="h-3 w-3" />
                      {stat.delta}
                    </span>
                  ) : null}
                </div>
                {stat.footer ? (
                  <span className="mt-1 block text-[11px] text-text-tertiary">{stat.footer}</span>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Widget shells -----------------------------------------------------------

function WidgetShell({ children, className, contentClassName }) {
  return (
    <Card
      className={cn(
        "h-full gap-0 overflow-hidden rounded-xl border-border bg-surface-subtle py-0 text-foreground",
        className,
      )}
    >
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

// --- Submissions over time (line + label, with detail) -----------------------

function SubmissionsTrendWidget() {
  const [metric, setMetric] = useState("submissions");
  const selected = TREND_RANGE_OPTIONS.find((o) => o.value === metric) || TREND_RANGE_OPTIONS[0];
  const series = TREND_SERIES[metric];
  const data = series.map((value, i) => ({ label: `W${i + 1}`, value }));
  const formatValue = (value) => value.toLocaleString();

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader
        title="Submissions Over Time"
        subtitle={`${selected.label} across your forms.`}
        action={<FilterDropdown value={metric} onValueChange={setMetric} options={TREND_RANGE_OPTIONS} height="h-9" />}
      />
      <div className="mt-4 flex min-h-0 flex-1 items-center justify-center">
        <ChartContainer config={{ value: { label: selected.label, color: ACCENT } }} className="mx-auto h-full w-full">
          <LineChart data={data} margin={{ top: 24, right: 16, left: 12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
                  hideLabel
                  formatter={(value) => (
                    <span className="font-medium tabular-nums text-foreground">{formatValue(value)}</span>
                  )}
                />
              }
            />
            <Line
              dataKey="value"
              type="monotone"
              stroke={ACCENT}
              strokeWidth={2}
              dot={{ fill: ACCENT, r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive
            >
              <LabelList dataKey="value" position="top" offset={10} className="fill-muted-foreground" fontSize={11} formatter={formatValue} />
            </Line>
          </LineChart>
        </ChartContainer>
      </div>
    </WidgetShell>
  );
}

// --- Response status mix (donut) ---------------------------------------------

function StatusMixWidget() {
  const [selectedType, setSelectedType] = useState(STATUS_MIX[0].key);
  const total = STATUS_MIX.reduce((sum, item) => sum + item.value, 0);
  const chartData = STATUS_MIX.map((item, index) => ({
    ...item,
    fill: STATUS_SERIES_COLORS[index % STATUS_SERIES_COLORS.length],
  }));
  const selectedIndex = Math.max(chartData.findIndex((item) => item.key === selectedType), 0);
  const selectedItem = chartData[selectedIndex] || chartData[0];
  const typeOptions = STATUS_MIX.map((item) => ({ value: item.key, label: item.label }));
  const chartConfig = STATUS_MIX.reduce(
    (config, item, index) => ({
      ...config,
      [item.key]: { label: item.label, color: STATUS_SERIES_COLORS[index % STATUS_SERIES_COLORS.length] },
    }),
    {},
  );

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader
        title="Response Status Mix"
        subtitle="Triage state across all responses."
        action={<FilterDropdown value={selectedType} onValueChange={setSelectedType} options={typeOptions} height="h-9" />}
      />
      <div className="relative mt-4 flex min-h-0 w-full flex-1 items-center justify-center">
        <ChartContainer config={chartConfig} className="mx-auto h-[220px] w-[220px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="key"
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={78}
              activeIndex={selectedIndex}
              activeShape={{ outerRadius: 88 }}
              onMouseEnter={(_, index) => setSelectedType(chartData[index]?.key || selectedType)}
              stroke="var(--background)"
              strokeWidth={2}
              isAnimationActive
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="text-3xl font-bold leading-none text-foreground">{selectedItem?.value.toLocaleString()}</span>
          <span className="mt-1 text-xs font-medium text-muted-foreground">{selectedItem?.label}</span>
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-text-secondary">
        {selectedItem?.label} is {Math.round((selectedItem.value / total) * 100)}% of {total.toLocaleString()} responses
      </p>
    </WidgetShell>
  );
}

// --- Top performing forms (table) --------------------------------------------

const TOP_FORMS_SORT_OPTIONS = [
  { value: "responses", label: "Responses" },
  { value: "completion", label: "Completion" },
];

function TopFormsTable() {
  const [sortBy, setSortBy] = useState("responses");
  const sorted = [...TOP_FORMS].sort((a, b) =>
    sortBy === "responses" ? b.responses - a.responses : b.completion - a.completion,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <WidgetHeader title="Top Performing Forms" subtitle="Ranked by responses and completion rate." />
        <FilterDropdown value={sortBy} onValueChange={setSortBy} options={TOP_FORMS_SORT_OPTIONS} height="h-9" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-card">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Form</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Completion</TableHead>
              <TableHead className="text-right">Responses</TableHead>
              <TableHead>Momentum</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((form) => {
              const meta = MOMENTUM_META[form.momentum] || MOMENTUM_META.track;
              const MomentumIcon = meta.icon;
              return (
                <TableRow key={form.name} className="border-border">
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{form.name}</span>
                      <p className="text-xs text-text-secondary">
                        {form.responses.toLocaleString()} responses
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex min-w-[80px] justify-center rounded-md border px-2 py-0.5 text-[10px] font-medium",
                        FORM_STATUS_META[form.status] || FORM_STATUS_META.Draft,
                      )}
                    >
                      {form.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="w-[140px] space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                        <div className="h-full rounded-full bg-foreground" style={{ width: `${form.completion}%` }} />
                      </div>
                      <p className="text-xs text-text-secondary">{form.completion}%</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-foreground">
                    {form.responses.toLocaleString()}
                  </TableCell>
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
                      className="text-muted-foreground hover:bg-surface-active hover:text-foreground"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// --- Overall stats (attention items) -----------------------------------------

function GeneralStatsCard() {
  const sorted = [...ATTENTION_ITEMS].sort(
    (a, b) => URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency),
  );
  const total = ATTENTION_ITEMS.length;

  return (
    <WidgetShell contentClassName="flex flex-col">
      <WidgetHeader
        title="Overall Stats"
        subtitle="A quick snapshot of what needs attention across your forms."
        action={
          <span className="shrink-0 rounded-md border border-border bg-surface-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {total} items
          </span>
        }
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              className="group flex items-center gap-3.5 rounded-xl p-3.5 text-left transition-colors hover:bg-surface-card"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-card text-muted-foreground">
                <Icon className="h-[18px] w-[18px]" />
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
              <span className="shrink-0 text-xl font-bold tabular-nums text-foreground">{item.value}</span>
              <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-text-secondary transition-colors group-hover:text-foreground">
                <ChevronRight className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>
    </WidgetShell>
  );
}

// --- Screen ------------------------------------------------------------------

export function OverviewScreen() {
  return (
    <div className="mx-auto flex w-full flex-col gap-8 px-2 py-4 text-foreground lg:max-w-[85%] lg:px-0">
      {/* Header: title + workspace summary stats */}
      <div className="mt-2">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex w-full items-center justify-center gap-3 text-center md:w-auto md:justify-start md:text-left">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Forms Overview</h1>
              <span className="shrink-0 rounded border border-border bg-surface-subtle px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-text-secondary">
                WORKSPACE
              </span>
            </div>
            <p className="mt-1 text-center text-sm text-muted-foreground md:text-left">
              Track submissions, completion, review load, and response quality across all your forms.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <div className="flex w-full md:w-auto md:gap-0">
              {WORKSPACE_SUMMARY.map((stat, i) => {
                const last = i === WORKSPACE_SUMMARY.length - 1;
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
      </div>

      {/* Summary stats bar */}
      <StatsBar stats={STATS} />

      {/* Bento hero: wide trend + donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="h-[360px] lg:col-span-2">
          <SubmissionsTrendWidget />
        </div>
        <div className="h-[360px]">
          <StatusMixWidget />
        </div>
      </div>

      {/* Top performing forms table */}
      <TopFormsTable />

      {/* Overall stats */}
      <GeneralStatsCard />
    </div>
  );
}

export default OverviewScreen;
