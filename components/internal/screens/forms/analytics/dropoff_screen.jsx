"use client";

import { useMemo, useState } from "react";
import { FileText, Filter, Inbox } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { includedFields, splitPages } from "@/lib/forms/logic";
import { isInputField } from "@/lib/forms/field-types";
import {
  buildFormMetrics,
  fieldLabelOf,
  formatDuration,
  formatPct,
  isAbandoned,
  pct,
  progressPct,
  shortDate,
  sinceIso,
  useAnalyticsData,
} from "./analytics_data";
import { FormPicker, FunnelStep, Meter, RangePicker } from "./analytics_ui";

export function DropoffScreen() {
  const [days, setDays] = useState("30");
  const [picked, setPicked] = useState(null);
  const [search, setSearch] = useState("");
  const [now] = useState(() => Date.now());
  const { forms, rangedResponses, events, partials, loading, error, refresh } = useAnalyticsData({ days, partials: true });

  const formId = picked && forms.some((f) => f.id === picked) ? picked : forms[0]?.id || null;
  const form = forms.find((f) => f.id === formId) || null;

  const funnel = useMemo(() => {
    if (!form) return null;
    return buildFormMetrics([form], events, rangedResponses)[0];
  }, [form, events, rangedResponses]);

  const abandoned = useMemo(() => {
    if (!formId) return [];
    const since = sinceIso(days);
    return partials.filter((p) => p.formId === formId && (p.updatedAt || "") >= since && isAbandoned(p, now));
  }, [partials, formId, days, now]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return abandoned;
    return abandoned.filter((p) => `${p.email || "anonymous"} ${fieldLabelOf(form, p.lastFieldId)}`.toLowerCase().includes(q));
  }, [abandoned, form, search]);
  const pager = usePagination(filteredSessions, { resetKey: `${search}|${formId}|${days}` });

  const fieldRows = useMemo(() => {
    if (!form) return [];
    const counts = new Map();
    for (const p of abandoned) if (p.lastFieldId) counts.set(p.lastFieldId, (counts.get(p.lastFieldId) || 0) + 1);
    return includedFields(form.fieldDefs || [])
      .filter((f) => isInputField(f.type) && f.type !== "hidden")
      .map((f, i) => ({
        id: f.id,
        order: i + 1,
        label: f.label || f.title || f.id,
        count: counts.get(f.id) || 0,
        share: pct(counts.get(f.id) || 0, abandoned.length) ?? 0,
      }));
  }, [form, abandoned]);

  const pageRows = useMemo(() => {
    if (!form) return [];
    const pages = splitPages(form.fieldDefs || [], form.name || "Page 1");
    const counts = new Map();
    for (const p of abandoned) counts.set(p.pageIndex || 0, (counts.get(p.pageIndex || 0) || 0) + 1);
    return pages.map((page, i) => ({
      id: page.id,
      label: page.title || `Page ${i + 1}`,
      count: counts.get(i) || 0,
      share: pct(counts.get(i) || 0, abandoned.length) ?? 0,
    }));
  }, [form, abandoned]);

  const abandonTimes = useMemo(
    () =>
      abandoned
        .map((p) => new Date(p.updatedAt).getTime() - new Date(p.createdAt).getTime())
        .filter((ms) => Number.isFinite(ms) && ms > 0)
        .sort((a, b) => a - b),
    [abandoned],
  );
  const medianAbandon = abandonTimes.length ? abandonTimes[Math.floor(abandonTimes.length / 2)] : null;
  const avgProgress = abandoned.length
    ? Math.round(abandoned.reduce((sum, p) => sum + progressPct(p.progress), 0) / abandoned.length)
    : null;

  const header = (
    <ScreenHeader
      title="Funnel & Drop-off"
      description="Where respondents leave: the view → start → submit funnel and the last field touched before abandoning."
      actions={
        <>
          <FormPicker forms={forms} value={formId} onChange={setPicked} />
          <RangePicker value={days} onChange={setDays} />
        </>
      }
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading funnel" />
      </MainScreenWrapper>
    );
  }
  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Funnel data couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }
  if (!form) {
    return (
      <MainScreenWrapper>
        {header}
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState icon={FileText} title="No forms yet" description="Create and publish a form to see its funnel." />
        </div>
      </MainScreenWrapper>
    );
  }

  const stats = [
    { label: "Abandoned sessions", value: abandoned.length.toLocaleString(), footer: "Idle 30m+ without submitting" },
    { label: "Median time to abandon", value: formatDuration(medianAbandon), footer: "First save to last activity" },
    { label: "Avg progress at exit", value: avgProgress == null ? "—" : `${avgProgress}%`, footer: "Of the form completed" },
    { label: "Conversion", value: formatPct(funnel.conversion), footer: "Submissions ÷ views" },
  ];

  const sessionColumns = [
    { key: "email", header: "Respondent", render: (p) => <span className="text-sm text-foreground">{p.email || "Anonymous"}</span> },
    {
      key: "progress",
      header: "Progress",
      render: (p) => {
        const value = progressPct(p.progress);
        return (
          <div className="flex min-w-28 items-center gap-2">
            <Meter value={value} className="w-20" />
            <span className="tabular-nums text-xs text-text-secondary">{value}%</span>
          </div>
        );
      },
    },
    { key: "field", header: "Last field", render: (p) => <span className="text-text-secondary">{fieldLabelOf(form, p.lastFieldId)}</span> },
    { key: "page", header: "Page", align: "right", render: (p) => <span className="tabular-nums">{(p.pageIndex || 0) + 1}</span> },
    {
      key: "time",
      header: "Time spent",
      align: "right",
      render: (p) => <span className="tabular-nums text-text-secondary">{formatDuration(new Date(p.updatedAt) - new Date(p.createdAt))}</span>,
    },
    { key: "when", header: "Last active", align: "right", render: (p) => <span className="text-text-tertiary">{shortDate(p.updatedAt)}</span> },
  ];

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Funnel" description={`${form.name} · selected range`}>
          <div className="space-y-5">
            <FunnelStep label="Viewed" count={funnel.views} share={funnel.views ? 100 : null} />
            <FunnelStep label="Started" count={funnel.starts} share={pct(funnel.starts, funnel.views)} hint={`Start rate ${formatPct(funnel.startRate)}`} />
            <FunnelStep label="Submitted" count={funnel.submits} share={pct(funnel.submits, funnel.views)} hint={`Completion ${formatPct(funnel.completion)} of starts`} />
          </div>
        </SectionCard>

        <SectionCard title="Field drop-off" description="Share of abandoned sessions whose last touched field was this one." className="lg:col-span-2">
          {!abandoned.length ? (
            <EmptyState icon={Filter} title="No abandoned sessions" description="Drop-off appears once respondents start the form and leave before submitting (save & resume or autosave records progress)." />
          ) : (
            <div className="space-y-3">
              {fieldRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_7rem_4.5rem] items-center gap-3">
                  <span className="tabular-nums text-xs text-text-tertiary">{row.order}</span>
                  <span className="truncate text-sm text-foreground">{row.label}</span>
                  <Meter value={row.share} barClassName={row.share >= 30 ? "bg-red-400" : row.share >= 15 ? "bg-amber-400" : "bg-foreground/70"} />
                  <span className="text-right tabular-nums text-xs text-text-secondary">
                    {row.count} · {row.share}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {pageRows.length > 1 ? (
        <SectionCard title="Page drop-off" description="Which page abandoned sessions were on when they left.">
          <div className="space-y-3">
            {pageRows.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)_10rem_4.5rem] items-center gap-3">
                <span className="tabular-nums text-xs text-text-tertiary">{i + 1}</span>
                <span className="truncate text-sm text-foreground">{row.label}</span>
                <Meter value={row.share} />
                <span className="text-right tabular-nums text-xs text-text-secondary">{row.count} · {row.share}%</span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Abandoned sessions" description="Most recent first." bodyPadding={false}>
        <div className="flex items-center justify-end border-b border-border px-5 py-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search respondents or fields…" />
        </div>
        <DataTable
          className="rounded-none border-0"
          columns={sessionColumns}
          data={pager.pageItems}
          getRowKey={(p) => p.id}
          empty={
            abandoned.length ? (
              <EmptyState
                icon={Inbox}
                title="No sessions match your search"
                description="Try a different respondent email or field name."
                action={
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                }
              />
            ) : (
              <EmptyState icon={Inbox} title="Nothing abandoned" description="Every started session in this range was submitted or is still in progress." />
            )
          }
        />
        <ListPagination {...pager} itemLabel="sessions" className="border-t border-border px-5 py-3" />
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default DropoffScreen;
