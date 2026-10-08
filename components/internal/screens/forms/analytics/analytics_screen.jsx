"use client";

import { useMemo, useState } from "react";
import { BarChart3, FileText } from "lucide-react";
import { Button } from "@geiger/ui/button";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@geiger/ui/chart";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { RESPONSE_STATUSES } from "@/lib/forms/schema";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import {
  AXIS_TICK,
  GRID_STROKE,
  SERIES,
  buildDailySeries,
  buildFormMetrics,
  formatDuration,
  formatPct,
  totalsOf,
  useAnalyticsData,
} from "./analytics_data";
import { Meter, RangePicker } from "./analytics_ui";

// Response status colors shared by every analytics status list.
export const RESPONSE_STATUS_MAP = {
  Complete: { label: "Complete", variant: "success", dotClass: "bg-emerald-400" },
  "Needs review": { label: "Needs review", variant: "warning", dotClass: "bg-amber-400" },
  Pending: { label: "Pending", variant: "neutral", dotClass: "bg-text-tertiary" },
  "In progress": { label: "In progress", variant: "info", dotClass: "bg-sky-400" },
  Approved: { label: "Approved", variant: "success", dotClass: "bg-emerald-400" },
  Rejected: { label: "Rejected", variant: "danger", dotClass: "bg-red-400" },
  "Awaiting payment": { label: "Awaiting payment", variant: "purple", dotClass: "bg-violet-400" },
  Spam: { label: "Spam", variant: "danger", dotClass: "bg-red-400" },
};

const FORM_STATUS_MAP = {
  Published: { label: "Published", variant: "success", dotClass: "bg-emerald-400" },
  Draft: { label: "Draft", variant: "neutral", dotClass: "bg-text-tertiary" },
  Archived: { label: "Archived", variant: "neutral", dotClass: "bg-text-tertiary" },
};

const CHART_CONFIG = {
  views: { label: "Views", color: SERIES.views },
  starts: { label: "Starts", color: SERIES.starts },
  submits: { label: "Submissions", color: SERIES.submits },
};

const DESCRIPTION = "Views, starts, and submissions across this workspace's forms.";

function TrendChart({ data }) {
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[260px] w-full">
      <LineChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={AXIS_TICK} minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} tick={AXIS_TICK} allowDecimals={false} width={40} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
        <ChartLegend content={<ChartLegendContent />} />
        {Object.keys(CHART_CONFIG).map((k) => (
          <Line key={k} dataKey={k} type="monotone" stroke={`var(--color-${k})`} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function StatusMix({ responses }) {
  const rows = useMemo(() => {
    const counts = new Map();
    for (const r of responses) counts.set(r.status, (counts.get(r.status) || 0) + 1);
    return RESPONSE_STATUSES.filter((s) => counts.get(s)).map((s) => ({ status: s, count: counts.get(s) }));
  }, [responses]);
  const total = responses.length;

  if (!rows.length) {
    return <p className="py-10 text-center text-xs text-text-tertiary">No responses in this range.</p>;
  }
  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const share = Math.round((row.count / total) * 100);
        return (
          <div key={row.status} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <StatusPill status={row.status} map={RESPONSE_STATUS_MAP} />
              <span className="tabular-nums text-xs text-foreground">
                {row.count.toLocaleString()} <span className="text-text-tertiary">· {share}%</span>
              </span>
            </div>
            <Meter value={share} />
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsScreen() {
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const { openForm } = useWorkspaceUrl();
  const { forms, rangedResponses, events, loading, error, refresh } = useAnalyticsData({ days });

  const metrics = useMemo(() => buildFormMetrics(forms, events, rangedResponses), [forms, events, rangedResponses]);
  const totals = useMemo(() => totalsOf(metrics), [metrics]);
  const series = useMemo(() => buildDailySeries(days, events, rangedResponses), [days, events, rangedResponses]);
  const tableRows = useMemo(
    () => [...metrics].sort((a, b) => b.submits - a.submits || b.views - a.views),
    [metrics],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? tableRows.filter((row) => (row.name || "").toLowerCase().includes(q)) : tableRows;
  }, [tableRows, search]);
  const pager = usePagination(filtered, { resetKey: `${search}|${days}` });

  const header = (
    <ScreenHeader title="Analytics" description={DESCRIPTION} actions={<RangePicker value={days} onChange={setDays} />} />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Crunching your analytics" />
      </MainScreenWrapper>
    );
  }

  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Analytics events couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }

  if (!forms.length) {
    return (
      <MainScreenWrapper>
        {header}
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState icon={FileText} title="No forms yet" description="Create and publish a form to start collecting views, starts, and submissions." />
        </div>
      </MainScreenWrapper>
    );
  }

  const primary = [
    { label: "Views", value: totals.views.toLocaleString(), footer: "Unique form sessions" },
    { label: "Starts", value: totals.starts.toLocaleString(), footer: "Answered a first field" },
    { label: "Submissions", value: totals.submits.toLocaleString(), footer: "Spam excluded" },
    { label: "Conversion", value: formatPct(totals.conversion), footer: "Submissions ÷ views" },
  ];
  const secondary = [
    { label: "Start rate", value: formatPct(totals.startRate), footer: "Starts ÷ views" },
    { label: "Completion", value: formatPct(totals.completion), footer: "Submissions ÷ starts" },
    { label: "Avg completion time", value: formatDuration(totals.avgMs), footer: "First answer to submit" },
  ];

  const columns = [
    {
      key: "name",
      header: "Form",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{row.name}</p>
          <StatusPill status={row.status} map={FORM_STATUS_MAP} className="mt-1" />
        </div>
      ),
    },
    { key: "views", header: "Views", align: "right", render: (row) => <span className="tabular-nums">{row.views.toLocaleString()}</span> },
    { key: "starts", header: "Starts", align: "right", render: (row) => <span className="tabular-nums">{row.starts.toLocaleString()}</span> },
    { key: "submits", header: "Submits", align: "right", render: (row) => <span className="tabular-nums">{row.submits.toLocaleString()}</span> },
    {
      key: "conversion",
      header: "Conversion",
      render: (row) => (
        <div className="flex min-w-28 items-center gap-2">
          <Meter value={row.conversion ?? 0} className="w-20" />
          <span className="tabular-nums text-xs text-text-secondary">{formatPct(row.conversion)}</span>
        </div>
      ),
    },
    { key: "avg", header: "Avg time", align: "right", render: (row) => <span className="tabular-nums text-text-secondary">{formatDuration(row.avgMs)}</span> },
  ];

  return (
    <MainScreenWrapper>
      {header}
      <div className="space-y-4">
        <StatsBar stats={primary} />
        <StatsBar stats={secondary} columns={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Trend" description="Daily views, starts, and submissions." className="lg:col-span-2">
          {totals.views + totals.submits + totals.starts === 0 ? (
            <EmptyState icon={BarChart3} title="No activity in this range" description="Published forms record a view when opened and a start on the first answer." />
          ) : (
            <TrendChart data={series} />
          )}
        </SectionCard>
        <SectionCard title="Status mix" description="Triage state of responses in this range.">
          <StatusMix responses={rangedResponses} />
        </SectionCard>
      </div>

      <SectionCard title="Per-form performance" description="Click a form to open its editor." bodyPadding={false}>
        <div className="flex items-center justify-end border-b border-border px-5 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
        </div>
        <DataTable
          className="rounded-none border-0"
          columns={columns}
          data={pager.pageItems}
          getRowKey={(row) => row.id}
          onRowClick={(row) => openForm(row.id, "overview")}
          empty={
            <EmptyState
              icon={FileText}
              title="No forms match your search"
              description="Try a different form name."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          }
        />
        <ListPagination {...pager} itemLabel="forms" className="border-t border-border px-5 py-3" />
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default AnalyticsScreen;
