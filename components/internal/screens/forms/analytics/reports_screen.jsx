"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FileText, LineChart, Mail } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
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
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { FormResponsesScreen } from "@/components/internal/screens/forms/responses/form_responses_screen";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { shortDate } from "./analytics_data";

// Reports hub: pick a form to open its full response report (incl. survey summaries), plus weekly digest overview.
export function ReportsScreen({ survey = false }) {
  const { forms, loading, error, refresh } = useForms();
  const { openForm } = useWorkspaceUrl();
  const [picked, setPicked] = useState(null);
  const [search, setSearch] = useState("");
  const [digestSearch, setDigestSearch] = useState("");

  const rows = useMemo(() => [...forms].sort((a, b) => (b.responses || 0) - (a.responses || 0)), [forms]);
  const digests = useMemo(() => forms.filter((f) => (f.settings?.reportEmails || []).length), [forms]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((f) => (f.name || "").toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const filteredDigests = useMemo(() => {
    const q = digestSearch.trim().toLowerCase();
    return q ? digests.filter((f) => `${f.name || ""} ${f.settings.reportEmails.join(" ")}`.toLowerCase().includes(q)) : digests;
  }, [digests, digestSearch]);
  const pager = usePagination(filtered, { resetKey: search });
  const digestPager = usePagination(filteredDigests, { resetKey: digestSearch });
  const form = forms.find((f) => f.id === picked);

  if (form) return <FormResponsesScreen form={form} onBack={() => setPicked(null)} />;

  const header = (
    <ScreenHeader
      title={survey ? "Survey Reporting" : "Reports"}
      description="Open any form's report for per-question summaries, charts, and response details. Weekly digests email a summary to stakeholders."
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading reports" />
      </MainScreenWrapper>
    );
  }
  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Forms couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }

  const totalResponses = forms.reduce((s, f) => s + (f.responses || 0), 0);
  const stats = [
    { label: "Forms", value: String(forms.length) },
    { label: "Responses", value: totalResponses.toLocaleString() },
    { label: "Weekly digests", value: String(digests.length), footer: "Forms with report recipients" },
    { label: "Digest recipients", value: String(new Set(digests.flatMap((f) => f.settings.reportEmails)).size) },
  ];

  const columns = [
    {
      key: "name",
      header: "Form",
      render: (f) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
          <p className="text-xs text-text-tertiary">{f.fields} fields · updated {f.lastEdited || shortDate(f.updatedAt)}</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (f) => <Badge variant={f.status === "Published" ? "success" : "neutral"}>{f.status}</Badge> },
    { key: "responses", header: "Responses", align: "right", render: (f) => <span className="tabular-nums">{(f.responses || 0).toLocaleString()}</span> },
    {
      key: "open",
      header: "",
      align: "right",
      render: () => <ChevronRight className="ml-auto h-4 w-4 text-text-tertiary" aria-hidden="true" />,
    },
  ];

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(f) => f.id}
          onRowClick={(f) => setPicked(f.id)}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {rows.length ? (
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
              ) : (
                <EmptyState icon={FileText} title="No forms yet" description="Reports appear once you have a form collecting responses." />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="forms" />
      </div>

      <SectionCard
        title="Weekly digest emails"
        description="Each recipient gets a weekly summary of new responses, completion, and top answers. Recipients are set in a form's Notifications section; digests go out on Mondays (UTC) via /api/cron/reports, which needs CRON_SECRET and RESEND_API_KEY."
        bodyPadding={false}
      >
        {digests.length ? (
          <>
            <div className="flex items-center justify-end border-b border-border px-5 py-3">
              <SearchInput value={digestSearch} onChange={setDigestSearch} placeholder="Search forms or recipients…" />
            </div>
            {filteredDigests.length ? (
              <div className="divide-y divide-border">
                {digestPager.pageItems.map((f) => (
                  <div key={f.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{f.name}</p>
                      <p className="truncate text-xs text-text-secondary">{f.settings.reportEmails.join(", ")}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openForm(f.id, "notifications")}>
                      Configure
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Mail}
                title="No digests match your search"
                description="Try a different form name or recipient email."
                action={
                  <Button variant="outline" onClick={() => setDigestSearch("")}>
                    Clear search
                  </Button>
                }
              />
            )}
            <ListPagination {...digestPager} itemLabel="digests" className="border-t border-border px-5 py-3" />
          </>
        ) : (
          <EmptyState
            icon={Mail}
            title="No digests configured"
            description="Add report recipients in a form's Notifications section to send a weekly summary."
            action={
              forms[0] ? (
                <Button variant="outline" size="sm" onClick={() => openForm(forms[0].id, "notifications")}>
                  <LineChart className="h-3.5 w-3.5" /> Set up a digest
                </Button>
              ) : null
            }
          />
        )}
      </SectionCard>
    </MainScreenWrapper>
  );
}

export default ReportsScreen;
