"use client";

import { useEffect, useMemo, useState } from "react";
import { FileWarning, SearchX } from "lucide-react";
import { Button } from "@geiger/ui/button";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  StatusPill,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { listPartials } from "@/lib/supabase/responses";
import { fieldLabelOf, formatDuration, isAbandoned, progressPct } from "@/components/internal/screens/forms/analytics/analytics_data";
import { FormPicker, Meter } from "@/components/internal/screens/forms/analytics/analytics_ui";

const STATE_MAP = {
  progress: { label: "In progress", variant: "info", dotClass: "bg-sky-400" },
  abandoned: { label: "Abandoned", variant: "warning", dotClass: "bg-amber-400" },
  recovered: { label: "Submitted", variant: "success", dotClass: "bg-emerald-400" },
};

const STATE_OPTIONS = [
  { value: "all", label: "All states" },
  { value: "abandoned", label: "Abandoned" },
  { value: "progress", label: "In progress" },
  { value: "recovered", label: "Submitted" },
];

function stateOf(p, now) {
  if (p.completedAt) return "recovered";
  return isAbandoned(p, now) ? "abandoned" : "progress";
}

export function PartialsScreen() {
  const { forms, loading: formsLoading, error: formsError, refresh } = useForms();
  const { openForm } = useWorkspaceUrl();
  const [formId, setFormId] = useState("all");
  const [state, setState] = useState("all");
  const [search, setSearch] = useState("");
  const formIdsKey = useMemo(() => forms.map((f) => f.id).join(","), [forms]);
  const [result, setResult] = useState({ key: null, rows: [], error: null });

  useEffect(() => {
    if (formsLoading) return undefined;
    let alive = true;
    const ids = formIdsKey ? formIdsKey.split(",") : [];
    (async () => {
      if (!ids.length) return { rows: [], error: null };
      try {
        return { rows: await listPartials({ formIds: ids }), error: null };
      } catch (err) {
        console.error("[partials.list]", err);
        return { rows: [], error: err };
      }
    })().then((next) => alive && setResult({ key: formIdsKey, ...next }));
    return () => {
      alive = false;
    };
  }, [formsLoading, formIdsKey]);

  const loading = formsLoading || result.key !== formIdsKey;
  const formById = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms]);
  const [now] = useState(() => Date.now());

  const rows = useMemo(
    () => result.rows.map((p) => ({ ...p, state: stateOf(p, now), progressValue: progressPct(p.progress) })),
    [result.rows, now],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (formId !== "all" && p.formId !== formId) return false;
      if (state !== "all" && p.state !== state) return false;
      if (q && !(p.email || "").toLowerCase().includes(q) && !(formById.get(p.formId)?.name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, formId, state, search, formById]);

  const pager = usePagination(filtered, { resetKey: `${search}|${formId}|${state}` });

  const stats = useMemo(() => {
    const scoped = formId === "all" ? rows : rows.filter((p) => p.formId === formId);
    const open = scoped.filter((p) => p.state !== "recovered");
    const recovered = scoped.length - open.length;
    return [
      { label: "Abandoned", value: String(scoped.filter((p) => p.state === "abandoned").length), footer: "Idle 30m+ without submitting" },
      { label: "In progress", value: String(scoped.filter((p) => p.state === "progress").length), footer: "Active in the last 30 minutes" },
      { label: "Recovered", value: scoped.length ? `${Math.round((recovered / scoped.length) * 100)}%` : "—", footer: `${recovered} partials later submitted` },
      {
        label: "Avg progress",
        value: open.length ? `${Math.round(open.reduce((s, p) => s + p.progressValue, 0) / open.length)}%` : "—",
        footer: "Of unfinished sessions",
      },
    ];
  }, [rows, formId]);

  const columns = [
    {
      key: "form",
      header: "Form",
      render: (p) => <span className="block max-w-56 truncate font-medium text-foreground">{formById.get(p.formId)?.name || "Form"}</span>,
    },
    { key: "email", header: "Respondent", render: (p) => <span className="text-text-secondary">{p.email || "Anonymous"}</span> },
    {
      key: "progress",
      header: "Progress",
      render: (p) => (
        <div className="flex min-w-28 items-center gap-2">
          <Meter value={p.progressValue} className="w-20" />
          <span className="tabular-nums text-xs text-text-secondary">{p.progressValue}%</span>
        </div>
      ),
    },
    { key: "field", header: "Last field", render: (p) => <span className="text-text-secondary">{fieldLabelOf(formById.get(p.formId), p.lastFieldId)}</span> },
    { key: "page", header: "Page", align: "right", render: (p) => <span className="tabular-nums">{(p.pageIndex || 0) + 1}</span> },
    { key: "state", header: "State", render: (p) => <StatusPill status={p.state} map={STATE_MAP} /> },
    {
      key: "updated",
      header: "Updated",
      align: "right",
      render: (p) => (
        <span className="text-text-tertiary" title={formatDuration(new Date(p.updatedAt) - new Date(p.createdAt))}>
          {p.when}
        </span>
      ),
    },
  ];

  const header = (
    <ScreenHeader
      title="Partial & Abandoned"
      description="Sessions that started a form but haven't submitted. Partials are saved when Save & Resume is on; respondents get a resume link by email."
      actions={
        forms[0] ? (
          <Button variant="outline" onClick={() => openForm(formId !== "all" ? formId : forms[0].id, "saveresume")}>
            Save & Resume settings
          </Button>
        ) : null
      }
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading partial responses" />
      </MainScreenWrapper>
    );
  }
  if (formsError || result.error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Partial responses couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }

  const hasFilters = formId !== "all" || state !== "all" || search;

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FormPicker forms={forms} value={formId} onChange={setFormId} allowAll />
          <FilterDropdown value={state} onValueChange={setState} options={STATE_OPTIONS} height="h-9" />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search email or form…" />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(p) => p.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {rows.length && hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="No partials match"
                  description="Try a different form, state, or search."
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormId("all");
                        setState("all");
                        setSearch("");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState icon={FileWarning} title="No partial responses" description="Turn on Save & Resume in a form to capture unfinished sessions and recover them." />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="partials" />
      </div>
      <SectionCard title="About resume links">
        <p className="text-sm text-text-secondary">
          Resume links are private to the respondent: they&apos;re emailed when someone chooses &ldquo;Save and finish later&rdquo; and are never shown in the workspace. Recovered sessions are marked Submitted once the respondent completes the form.
        </p>
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default PartialsScreen;
