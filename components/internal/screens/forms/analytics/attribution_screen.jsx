"use client";

import { useMemo, useState } from "react";
import { FileText, Route } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import {
  attributionOf,
  formatPct,
  isCountedResponse,
  pct,
  uniqueEvents,
  useAnalyticsData,
} from "./analytics_data";
import { FormPicker, Meter, RangePicker } from "./analytics_ui";

const DIMENSIONS = [
  { value: "source", label: "Source", plural: "sources", empty: "(direct)" },
  { value: "medium", label: "Medium", plural: "mediums", empty: "(none)" },
  { value: "campaign", label: "Campaign", plural: "campaigns", empty: "(none)" },
  { value: "referrerHost", label: "Referrer", plural: "referrers", empty: "(direct)" },
];

// Groups events and responses by one attribution dimension.
function groupBy(dimension, events, responses) {
  const empty = DIMENSIONS.find((d) => d.value === dimension)?.empty || "(none)";
  const rows = new Map();
  const row = (value) => {
    const k = value || empty;
    if (!rows.has(k)) rows.set(k, { value: k, views: 0, starts: 0, submits: 0 });
    return rows.get(k);
  };
  for (const e of uniqueEvents(events)) {
    const attr = attributionOf(e.metadata);
    if (e.type === "view") row(attr[dimension]).views += 1;
    else if (e.type === "start") row(attr[dimension]).starts += 1;
  }
  for (const r of responses) {
    if (!isCountedResponse(r)) continue;
    row(attributionOf(r.metadata)[dimension]).submits += 1;
  }
  return [...rows.values()]
    .map((r) => ({ ...r, conversion: pct(r.submits, r.views) }))
    .sort((a, b) => b.submits - a.submits || b.views - a.views);
}

export function AttributionScreen() {
  const [days, setDays] = useState("30");
  const [formId, setFormId] = useState("all");
  const [dimension, setDimension] = useState("source");
  const [search, setSearch] = useState("");
  const { forms, rangedResponses, events, loading, error, refresh } = useAnalyticsData({ days });

  const scopedEvents = useMemo(() => (formId === "all" ? events : events.filter((e) => e.formId === formId)), [events, formId]);
  const scopedResponses = useMemo(
    () => (formId === "all" ? rangedResponses : rangedResponses.filter((r) => r.formId === formId)),
    [rangedResponses, formId],
  );
  const rows = useMemo(() => groupBy(dimension, scopedEvents, scopedResponses), [dimension, scopedEvents, scopedResponses]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.value.toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const pager = usePagination(filtered, { resetKey: `${search}|${dimension}|${formId}|${days}` });

  const stats = useMemo(() => {
    const counted = scopedResponses.filter(isCountedResponse);
    const tracked = counted.filter((r) => {
      const a = attributionOf(r.metadata);
      return a.source || a.medium || a.campaign || a.referrerHost;
    }).length;
    const sources = new Set(counted.map((r) => attributionOf(r.metadata).source).filter(Boolean));
    const campaigns = new Set(counted.map((r) => attributionOf(r.metadata).campaign).filter(Boolean));
    const top = groupBy("source", scopedEvents, scopedResponses).find((r) => r.value !== "(direct)" && r.submits > 0);
    return [
      { label: "Attributed submissions", value: formatPct(pct(tracked, counted.length)), footer: `${tracked} of ${counted.length} carry UTM or referrer` },
      { label: "Sources", value: String(sources.size), footer: "Distinct utm_source values" },
      { label: "Campaigns", value: String(campaigns.size), footer: "Distinct utm_campaign values" },
      { label: "Top source", value: top?.value || "—", footer: top ? `${top.submits} submissions` : "No tagged traffic yet" },
    ];
  }, [scopedEvents, scopedResponses]);

  const maxSubmits = Math.max(1, ...rows.map((r) => r.submits));
  const dim = DIMENSIONS.find((d) => d.value === dimension);
  const dimLabel = dim?.label;

  const columns = [
    { key: "value", header: dimLabel, render: (r) => <span className="font-medium text-foreground">{r.value}</span> },
    { key: "views", header: "Views", align: "right", render: (r) => <span className="tabular-nums">{r.views.toLocaleString()}</span> },
    { key: "starts", header: "Starts", align: "right", render: (r) => <span className="tabular-nums">{r.starts.toLocaleString()}</span> },
    {
      key: "submits",
      header: "Submissions",
      render: (r) => (
        <div className="flex min-w-32 items-center gap-2">
          <Meter value={(r.submits / maxSubmits) * 100} className="w-20" />
          <span className="tabular-nums text-xs text-foreground">{r.submits.toLocaleString()}</span>
        </div>
      ),
    },
    { key: "conversion", header: "Conversion", align: "right", render: (r) => <span className="tabular-nums text-text-secondary">{formatPct(r.conversion)}</span> },
  ];

  const header = (
    <ScreenHeader
      title="Source & Attribution"
      description="Which channels, campaigns, and referrers drive views and submissions. Tag links with utm_source, utm_medium, and utm_campaign."
      actions={
        <>
          <FormPicker forms={forms} value={formId} onChange={setFormId} allowAll />
          <RangePicker value={days} onChange={setDays} />
        </>
      }
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading attribution" />
      </MainScreenWrapper>
    );
  }
  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Attribution data couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }
  if (!forms.length) {
    return (
      <MainScreenWrapper>
        {header}
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState icon={FileText} title="No forms yet" description="Publish a form and share tagged links to see attribution." />
        </div>
      </MainScreenWrapper>
    );
  }

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <Tabs value={dimension} onValueChange={setDimension}>
          <TabsList className="max-w-full justify-start overflow-x-auto overflow-y-hidden [scrollbar-width:none]">
            {DIMENSIONS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${dim?.plural || "values"}…`} />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(r) => r.value}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {rows.length ? (
                <EmptyState
                  icon={Route}
                  title={`No ${dim?.plural || "values"} match your search`}
                  description="Try a different search."
                  action={
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={Route} title="No traffic in this range" description="Views and submissions appear here once respondents open your published forms." />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel={dim?.plural || "values"} />
      </div>
      <SectionCard title="How attribution is captured">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-text-secondary">
          <li>UTM parameters on the public form URL (for example <code className="rounded bg-surface-card px-1 text-xs">?utm_source=newsletter&utm_campaign=spring</code>) are stored on every view, start, and submission.</li>
          <li>The referring page host is recorded when the browser sends one; embedded forms report the host page.</li>
          <li>Conversion is submissions ÷ views for each value; spam-flagged responses are excluded.</li>
        </ul>
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default AttributionScreen;
