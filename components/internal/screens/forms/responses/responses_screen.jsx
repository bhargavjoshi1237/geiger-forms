"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, Clock, Download, FileJson, FileText, Inbox, Timer, Users, Zap } from "lucide-react";
import { FormsScreenShell, LoadingState, ErrorState } from "../screen-shell";
import { SegmentedTabs } from "@/components/internal/shared/segmented_tabs";
import { ResponseDetailPanel } from "@/components/forms/response-detail-panel";
import { useResponses } from "@/lib/hooks/use-responses";
import { summarizeResponses } from "@/lib/supabase/responses";
import { downloadResponses } from "@/lib/forms/export";

const STATUS_STYLE = {
  Complete: { bg: "bg-[#0d2218]", text: "text-[#4ade80]", border: "border-[#166534]" },
  "Needs review": { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Pending: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const PRIORITY_STYLE = {
  High: { bg: "bg-[#2a0808]", text: "text-[#f87171]", border: "border-[#7f1d1d]" },
  Medium: { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Low: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const AVATAR_COLORS = ["bg-[#0e1e2e]", "bg-[#0d2218]", "bg-[#2a1a08]", "bg-[#1a0d2e]", "bg-surface-subtle", "bg-[#0d1e1a]"];
const ALL_TABS = ["All", "Complete", "Needs review", "Pending"];
const PRIORITY_TABS = ["All", "High", "Medium", "Low"];

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">
        <Download className="h-3.5 w-3.5" />
        Export
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-surface-card shadow-xl">
            <button type="button" onClick={() => { onExport("csv"); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              <FileText className="h-3.5 w-3.5 text-text-secondary" />Export as CSV
            </button>
            <button type="button" onClick={() => { onExport("json"); setOpen(false); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground">
              <FileJson className="h-3.5 w-3.5 text-text-secondary" />Export as JSON
            </button>
            <div className="border-t border-border px-3 py-2 text-[10px] text-text-tertiary">Exports the current filtered view</div>
          </div>
        </>
      )}
    </div>
  );
}

function PriorityDropdown({ value, onChange, counts }) {
  const [open, setOpen] = useState(false);
  const PRIORITY_DOT = { All: "bg-border-strong", High: "bg-[#f87171]", Medium: "bg-[#fb923c]", Low: "bg-[#78716c]" };
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface-card px-2.5 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        <Zap className="h-3 w-3 shrink-0" />
        <span className="text-muted-foreground">{value === "All" ? "Priority" : value}</span>
        {value !== "All" && (
          <span className="rounded-full bg-surface-hover px-1.5 py-px text-[10px] font-medium text-muted-foreground">{counts[value]}</span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-label="Close menu" />
          <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-md border border-border bg-surface-subtle py-1 shadow-xl">
            {PRIORITY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => { onChange(tab); setOpen(false); }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs transition-colors ${value === tab ? "text-white" : "text-text-secondary hover:text-muted-foreground"}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[tab]}`} />
                {tab === "All" ? "All priorities" : tab}
                <span className="ml-auto text-[10px] text-text-tertiary">{counts[tab]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ResponsesScreen() {
  const { responses, loading, error, refresh } = useResponses();
  const [activeTab, setActiveTab] = useState("All");
  const [priorityTab, setPriorityTab] = useState("All");
  const [exportNotice, setExportNotice] = useState(null);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const summary = summarizeResponses(responses);

  const filtered = responses.filter((r) => {
    if (activeTab !== "All" && r.status !== activeTab) return false;
    if (priorityTab !== "All" && r.priority !== priorityTab) return false;
    return true;
  });
  const counts = ALL_TABS.reduce((acc, tab) => {
    acc[tab] = tab === "All" ? responses.length : responses.filter((r) => r.status === tab).length;
    return acc;
  }, {});
  const priorityCounts = PRIORITY_TABS.reduce((acc, tab) => {
    acc[tab] = tab === "All" ? responses.length : responses.filter((r) => r.priority === tab).length;
    return acc;
  }, {});

  const handleExport = (format) => {
    downloadResponses(filtered, format, "responses");
    setExportNotice(`${filtered.length} responses exported as ${format.toUpperCase()}.`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const openResponse = (r, i) => {
    setSelectedResponse(r);
    setSelectedIndex(i);
  };

  return (
    <FormsScreenShell
      eyebrow="Submissions"
      title="Responses"
      description="Review incoming submissions, handoffs, and response quality across every form."
      stats={[
        { label: "Total", value: String(summary.total), detail: "All submissions", Icon: Inbox },
        { label: "Complete", value: `${summary.completePct}%`, detail: "Validated responses", Icon: CheckCircle2 },
        { label: "Needs review", value: String(summary.byStatus["Needs review"]), detail: "Awaiting review", Icon: Timer },
        { label: "Respondents", value: String(summary.respondents), detail: "Unique people", Icon: Users },
      ]}
    >
      {exportNotice && (
        <div className="flex items-center gap-2 rounded-md border border-[#166534] bg-[#0d2218] px-3 py-2.5 text-xs text-[#4ade80]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {exportNotice}
        </div>
      )}

      {loading ? (
        <LoadingState label="Loading responses…" />
      ) : error ? (
        <ErrorState title="Couldn't load responses" onRetry={refresh} />
      ) : (
      <div className="overflow-hidden rounded-md border border-border bg-surface-subtle">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          <SegmentedTabs
            tabs={ALL_TABS.map((tab) => ({ label: tab, value: tab, count: counts[tab] }))}
            value={activeTab}
            onChange={setActiveTab}
          />

          <div className="flex items-center gap-2">
            <PriorityDropdown value={priorityTab} onChange={setPriorityTab} counts={priorityCounts} />
            <div className="h-4 w-px bg-surface-hover" />
            <div className="hidden items-center gap-1.5 text-xs text-text-tertiary sm:flex">
              <Clock className="h-3 w-3" />Updated just now
            </div>
            <ExportMenu onExport={handleExport} />
          </div>
        </div>

        <div className="divide-y divide-[#242424]">
          {filtered.map((r, i) => {
            const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.Pending;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openResponse(r, i)}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-surface-card"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-muted-foreground ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                  {r.initials}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                    <span className="hidden text-xs text-text-tertiary sm:inline">·</span>
                    <span className="hidden truncate text-xs text-text-secondary sm:inline">{r.email}</span>
                  </div>
                  <span className="text-xs text-text-tertiary">{r.form}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {(() => { const p = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.Low; return <span className={`hidden rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex items-center gap-1 ${p.bg} ${p.text} ${p.border}`}><Zap className="h-2.5 w-2.5" />{r.priority}</span>; })()}
                  <span className="hidden rounded bg-surface-card px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground sm:block">{r.score}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${s.bg} ${s.text} ${s.border}`}>{r.status}</span>
                  <span className="hidden whitespace-nowrap text-xs text-text-tertiary sm:block">{r.received}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center">
              <p className="text-sm text-text-secondary">No responses with this status.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {selectedResponse && (
        <ResponseDetailPanel
          response={selectedResponse}
          index={selectedIndex}
          onClose={() => setSelectedResponse(null)}
          score={selectedResponse.score}
          priority={selectedResponse.priority}
        />
      )}
    </FormsScreenShell>
  );
}
