"use client";

import { useMemo } from "react";
import { BarChart3, Gauge, Inbox, TrendingUp, Users } from "lucide-react";
import { DataPanel, EmptyState, FormsScreenShell, LoadingState } from "../screen-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForms } from "@/lib/hooks/use-forms";
import { useResponses } from "@/lib/hooks/use-responses";
import { summarizeResponses } from "@/lib/supabase/responses";

function isFilled(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function fieldLabel(field) {
  return field.label || field.title || field.id;
}

function buildPerForm(forms, responses) {
  const formById = new Map(forms.map((f) => [f.id, f]));
  const byForm = new Map();
  for (const r of responses) {
    if (!byForm.has(r.formId)) {
      byForm.set(r.formId, { total: 0, complete: 0 });
    }
    const agg = byForm.get(r.formId);
    agg.total += 1;
    if (r.status === "Complete") agg.complete += 1;
  }

  const rows = [];
  for (const [formId, agg] of byForm) {
    const form = formById.get(formId);
    rows.push({
      id: formId,
      name: form?.name || "Unknown form",
      total: agg.total,
      complete: agg.complete,
      rate: agg.total ? Math.round((agg.complete / agg.total) * 100) : 0,
    });
  }
  rows.sort((a, b) => b.total - a.total);
  return rows;
}

function buildAvgScore(responses) {
  let sum = 0;
  let count = 0;
  for (const r of responses) {
    if (typeof r.score === "number") {
      sum += r.score;
      count += 1;
    }
  }
  return count ? Math.round((sum / count) * 10) / 10 : null;
}

function buildFieldFill(forms, perForm, responses) {
  if (perForm.length === 0) return null;
  const top = perForm[0];
  const form = forms.find((f) => f.id === top.id);
  if (!form) return null;

  const formResponses = responses.filter((r) => r.formId === top.id);
  const total = formResponses.length;

  const rows = (form.fieldDefs || [])
    .filter((field) => field.type !== "calculated")
    .map((field) => {
      let filled = 0;
      for (const r of formResponses) {
        if (isFilled(r.answers?.[field.id])) filled += 1;
      }
      return {
        id: field.id,
        label: fieldLabel(field),
        total,
        filled,
        rate: total ? Math.round((filled / total) * 100) : 0,
      };
    });

  return { formName: form.name, total, rows };
}

function CompletionBar({ rate }) {
  return (
    <div className="h-1.5 rounded-full bg-surface-active">
      <div className="h-1.5 rounded-full bg-border-strong" style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function FillBar({ rate }) {
  const color = rate >= 80 ? "bg-[#4ade80]" : rate >= 50 ? "bg-[#fbbf24]" : "bg-[#fb923c]";
  return (
    <div className="h-1.5 w-24 rounded-full bg-surface-active">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

export function AnalyticsScreen() {
  const { forms, loading: formsLoading } = useForms();
  const { responses, loading: responsesLoading } = useResponses();

  const summary = useMemo(() => summarizeResponses(responses), [responses]);
  const perForm = useMemo(() => buildPerForm(forms, responses), [forms, responses]);
  const avgScore = useMemo(() => buildAvgScore(responses), [responses]);
  const fieldFill = useMemo(() => buildFieldFill(forms, perForm, responses), [forms, perForm, responses]);

  const completionByForm = useMemo(() => perForm.slice(0, 6), [perForm]);
  const topForms = useMemo(() => perForm.slice(0, 5), [perForm]);

  if (formsLoading || responsesLoading) {
    return (
      <FormsScreenShell
        eyebrow="Insights"
        title="Analytics"
        description="Response health and field completion across your form workspace."
      >
        <LoadingState label="Crunching your analytics…" />
      </FormsScreenShell>
    );
  }

  const stats = [
    { label: "Responses", value: summary.total.toLocaleString(), Icon: Users },
    { label: "Respondents", value: summary.respondents.toLocaleString(), Icon: Gauge },
    { label: "Completion", value: `${summary.completePct}%`, Icon: TrendingUp },
    { label: "Avg score", value: avgScore == null ? "—" : String(avgScore), Icon: BarChart3 },
  ];

  if (summary.total === 0) {
    return (
      <FormsScreenShell
        eyebrow="Insights"
        title="Analytics"
        description="Response health and field completion across your form workspace."
        stats={stats}
      >
        <EmptyState
          Icon={Inbox}
          title="No responses yet"
          description="Once your forms start collecting submissions, completion rates and field fill metrics will appear here."
        />
      </FormsScreenShell>
    );
  }

  return (
    <FormsScreenShell
      eyebrow="Insights"
      title="Analytics"
      description="Response health and field completion across your form workspace."
      stats={stats}
    >
      <div className="grid gap-4 md:grid-cols-5">
        <DataPanel
          title="Completion by form"
          description="Share of each form's responses marked Complete"
          className="md:col-span-3"
        >
          <div className="space-y-4">
            {completionByForm.map((f) => (
              <div key={f.id}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="truncate pr-2 text-xs text-muted-foreground">{f.name}</span>
                  <span className="shrink-0 tabular-nums text-xs font-medium text-foreground">{f.rate}%</span>
                </div>
                <CompletionBar rate={f.rate} />
                <p className="mt-1 text-[10px] text-text-tertiary">{f.complete} of {f.total} complete</p>
              </div>
            ))}
          </div>
        </DataPanel>

        <DataPanel
          title="Top forms"
          description="By total responses"
          className="md:col-span-2"
        >
          <div className="space-y-2">
            {topForms.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-md bg-surface-card px-3 py-2.5">
                <span className="truncate pr-2 text-xs text-muted-foreground">{f.name}</span>
                <span className="shrink-0 tabular-nums text-xs font-medium text-foreground">{f.total}</span>
              </div>
            ))}
          </div>
        </DataPanel>
      </div>

      <DataPanel
        title="Field fill rate"
        description={
          fieldFill
            ? `Share of responses to "${fieldFill.formName}" that answered each field — the most-active form.`
            : "Per-field answer rates for the most-active form."
        }
      >
        {!fieldFill || fieldFill.rows.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-xs text-text-tertiary">
            No fields to analyze for the most-active form yet.
          </div>
        ) : (
          <div className="overflow-hidden">
            <Table className="min-w-[480px] text-xs">
              <TableHeader className="bg-transparent">
                <TableRow className="border-surface-active hover:bg-transparent">
                  <TableHead className="h-auto px-0 pb-2.5 pr-4 text-text-tertiary">Field</TableHead>
                  <TableHead className="h-auto px-0 pb-2.5 pr-4 text-right text-text-tertiary">Responses</TableHead>
                  <TableHead className="h-auto px-0 pb-2.5 pr-4 text-right text-text-tertiary">Filled</TableHead>
                  <TableHead className="h-auto px-0 pb-2.5 text-text-tertiary">Fill rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#1e1e1e]">
                {fieldFill.rows.map((row) => (
                  <TableRow key={row.id} className="border-[#1e1e1e] text-muted-foreground">
                    <TableCell className="px-0 py-3 pr-4 font-medium text-foreground">{row.label}</TableCell>
                    <TableCell className="px-0 py-3 pr-4 text-right tabular-nums text-text-secondary">{row.total.toLocaleString()}</TableCell>
                    <TableCell className="px-0 py-3 pr-4 text-right tabular-nums">{row.filled.toLocaleString()}</TableCell>
                    <TableCell className="px-0 py-3">
                      <div className="flex items-center gap-2">
                        <FillBar rate={row.rate} />
                        <span className={`tabular-nums text-[10px] font-medium ${row.rate >= 80 ? "text-[#4ade80]" : row.rate >= 50 ? "text-[#fbbf24]" : "text-[#fb923c]"}`}>
                          {row.rate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DataPanel>
    </FormsScreenShell>
  );
}
