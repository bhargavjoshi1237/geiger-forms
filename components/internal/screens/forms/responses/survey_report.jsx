"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, FileSignature, GraduationCap, Link2, Link2Off, Loader2, RefreshCw, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@geiger/ui/button";
import { Progress } from "@geiger/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { EmptyState, SectionCard, StatGrid, LoadingArea } from "@geiger/ui/screen-kit";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { useCan } from "@/context/rbac-context";
import { cn } from "@/lib/utils";
import { callApi } from "@/lib/forms/api";
import { fieldTypeLabel, formatMoney } from "@/lib/forms/logic";
import { MIN_SHARED_RESPONSES, crosstab, crosstabFields, csatScore, fieldTrend } from "@/lib/forms/survey-analytics";
import { aggregateField, answerFields, canonicalFields, fieldLabel, quizSummary } from "@/lib/forms/response-utils";
import { CopyField } from "../forms/sections/kit";
import { formatDateTime } from "./constants";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

function Bar({ value, max, className = "[&>*]:bg-sky-400/70" }) {
  return <Progress value={max ? Math.max(2, (value / max) * 100) : 0} className={cn("bg-surface-card", className)} />;
}

function Distribution({ counts, base }) {
  const entries = Object.entries(counts);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (!entries.length) return <p className="text-xs text-text-tertiary">No options configured.</p>;
  return (
    <ul className="space-y-2.5">
      {entries.map(([label, n]) => (
        <li key={label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-muted-foreground">{label}</span>
            <span className="shrink-0 tabular-nums text-text-secondary">{n} · {pct(n, base)}%</span>
          </div>
          <Bar value={n} max={max} />
        </li>
      ))}
    </ul>
  );
}

function Columns({ counts }) {
  const entries = Object.entries(counts);
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="flex h-28 items-end gap-1">
      {entries.map(([k, n]) => (
        <div key={k} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] tabular-nums text-text-tertiary">{n || ""}</span>
          <div className="w-full rounded-t bg-sky-400/70" style={{ height: `${(n / max) * 72}px`, minHeight: n ? 3 : 0 }} />
          <span className="text-[10px] tabular-nums text-text-secondary">{k}</span>
        </div>
      ))}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-text-tertiary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value ?? "—"}</p>
    </div>
  );
}

export function FieldReport({ agg, currency }) {
  const money = (v) => (v == null ? "—" : agg.field.type === "currency" ? formatMoney(v, agg.field.config?.currency || currency) : v);
  const csat = csatScore(agg);
  const metricsGrid = cn("grid gap-2", csat == null ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4");
  const csatMetric = csat == null ? null : <Metric label="CSAT" value={`${csat}%`} />;
  switch (agg.kind) {
    case "distribution":
      return <Distribution counts={agg.counts} base={agg.answered} />;
    case "scale":
      return (
        <div className="space-y-3">
          <div className={metricsGrid}>
            {csatMetric}
            <Metric label="Average" value={agg.avg} />
            <Metric label="Lowest" value={agg.min} />
            <Metric label="Highest" value={agg.max} />
          </div>
          <Columns counts={agg.counts} />
        </div>
      );
    case "opinion":
      return (
        <div className="space-y-3">
          <div className={metricsGrid}>
            {csatMetric}
            <Metric label="Average" value={agg.avg == null ? null : `${agg.avg} / ${agg.steps}`} />
            <Metric label="Lowest" value={agg.min} />
            <Metric label="Highest" value={agg.max} />
          </div>
          <Distribution counts={agg.counts} base={agg.answered} />
        </div>
      );
    case "nps": {
      const n = agg.promoters + agg.passives + agg.detractors;
      return (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <span className={cn("text-3xl font-bold tabular-nums", agg.nps == null ? "text-text-tertiary" : agg.nps >= 30 ? "text-emerald-600 dark:text-emerald-400" : agg.nps >= 0 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>
              {agg.nps == null ? "—" : agg.nps > 0 ? `+${agg.nps}` : agg.nps}
            </span>
            <span className="pb-1 text-xs text-text-tertiary">NPS · avg {agg.avg ?? "—"}</span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-card">
            <div className="bg-red-400" style={{ width: `${pct(agg.detractors, n)}%` }} />
            <div className="bg-amber-400" style={{ width: `${pct(agg.passives, n)}%` }} />
            <div className="bg-emerald-400" style={{ width: `${pct(agg.promoters, n)}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <span className="text-red-600 dark:text-red-400">Detractors {agg.detractors} ({pct(agg.detractors, n)}%)</span>
            <span className="text-center text-amber-600 dark:text-amber-400">Passives {agg.passives} ({pct(agg.passives, n)}%)</span>
            <span className="text-right text-emerald-600 dark:text-emerald-400">Promoters {agg.promoters} ({pct(agg.promoters, n)}%)</span>
          </div>
          <Columns counts={agg.counts} />
        </div>
      );
    }
    case "matrix": {
      const max = Math.max(1, ...agg.rows.flatMap((r) => Object.values(agg.grid[r] || {})));
      return (
        <Table className="text-xs">
          <TableHeader className="bg-transparent">
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="h-auto p-0" />
              {agg.cols.map((c) => <TableHead key={c} className="h-auto px-2 py-1.5 text-center text-xs font-medium normal-case tracking-normal text-text-tertiary">{c}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {agg.rows.map((row) => (
              <TableRow key={row} className="hover:bg-transparent">
                <TableCell className="py-1.5 pl-0 pr-3 text-muted-foreground">{row}</TableCell>
                {agg.cols.map((c) => {
                  const v = agg.grid[row]?.[c] || 0;
                  return (
                    <TableCell key={c} className="p-1 text-center">
                      <span className="relative block overflow-hidden rounded px-2 py-1 tabular-nums text-foreground">
                        <span className="absolute inset-0 bg-sky-400" style={{ opacity: v ? 0.1 + (v / max) * 0.45 : 0 }} />
                        <span className="relative">{v}</span>
                      </span>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    case "ranking":
      return agg.items.length ? (
        <ol className="space-y-2">
          {agg.items.map((item, i) => (
            <li key={item.option} className="flex items-center gap-3 text-xs">
              <span className="w-5 tabular-nums text-text-tertiary">{i + 1}.</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.option}</span>
              <span className="tabular-nums text-text-secondary">avg rank {item.avg}</span>
            </li>
          ))}
        </ol>
      ) : <p className="text-xs text-text-tertiary">No rankings yet.</p>;
    case "numeric":
      return (
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Min" value={money(agg.min)} />
          <Metric label="Average" value={money(agg.avg)} />
          <Metric label="Max" value={money(agg.max)} />
        </div>
      );
    case "text":
      return agg.latest.length ? (
        <ul className="divide-y divide-border">
          {agg.latest.map((a) => (
            <li key={a.id} className="py-2 first:pt-0 last:pb-0">
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{a.text}</p>
              <p className="mt-0.5 text-[10px] text-text-tertiary">{a.name} · {formatDateTime(a.at)}</p>
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-text-tertiary">No answers yet.</p>;
    default:
      return <p className="text-xs text-text-tertiary">{agg.answered} responses include this answer.</p>;
  }
}

function QuizSummary({ quiz, passMark }) {
  return (
    <SectionCard title="Quiz summary" description={`${quiz.graded} graded responses · pass mark ${passMark}%`}>
      <StatGrid
        columns={3}
        stats={[
          { label: "Average score", value: quiz.avg == null ? "—" : `${quiz.avg}%`, icon: GraduationCap },
          { label: "Pass rate", value: quiz.passRate == null ? "—" : `${quiz.passRate}%` },
          { label: "Graded", value: String(quiz.graded) },
        ]}
      />
      {quiz.questions.length ? (
        <ul className="mt-5 space-y-2.5">
          {quiz.questions.map((q) => (
            <li key={q.field.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{fieldLabel(q.field)}</span>
                <span className="shrink-0 tabular-nums text-text-secondary">{q.correct}/{q.total} correct · {q.rate}%</span>
              </div>
              <Bar value={q.rate} max={100} className={q.rate >= 70 ? "[&>*]:bg-emerald-400/70" : q.rate >= 40 ? "[&>*]:bg-amber-400/70" : "[&>*]:bg-red-400/70"} />
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}

// Score over time for one NPS or short-scale question; the scale's own range decides what a full bar means.
function TrendChart({ points, kind }) {
  const nps = kind === "nps";
  return (
    <div className="flex h-32 items-end gap-1 overflow-x-auto">
      {points.map((p) => {
        const height = p.value == null ? 0 : nps ? ((p.value + 100) / 200) * 88 : (p.value / 100) * 88;
        return (
          <div key={p.key} className="flex min-w-9 flex-1 flex-col items-center gap-1" title={`${p.key}: ${p.value ?? "no score"} from ${p.n} answer${p.n === 1 ? "" : "s"}`}>
            <span className="text-[10px] tabular-nums text-text-secondary">{p.value == null ? "—" : nps && p.value > 0 ? `+${p.value}` : nps ? p.value : `${p.value}%`}</span>
            <div className="w-full rounded-t bg-sky-400/70" style={{ height: `${height}px`, minHeight: p.value == null ? 0 : 3 }} />
            <span className="whitespace-nowrap text-[10px] tabular-nums text-text-tertiary">{p.key.slice(5) || p.key}</span>
          </div>
        );
      })}
    </div>
  );
}

function TrendsCard({ fields, responses }) {
  const scored = useMemo(() => fields.filter((f) => !f.sensitive).map((f) => ({ field: f, points: fieldTrend(f, responses, fields) })).filter((t) => t.points?.length > 1 && t.points.some((p) => p.value != null)), [fields, responses]);
  if (!scored.length) return null;
  return (
    <SectionCard title="Trends" description="NPS and satisfaction over time, by week or by month on longer spans. Hover a bar for its answer count.">
      <div className="grid gap-6 lg:grid-cols-2">
        {scored.map(({ field, points }) => (
          <div key={field.id}>
            <p className="mb-2 truncate text-xs font-medium text-muted-foreground">{fieldLabel(field)}</p>
            <TrendChart points={points} kind={field.type === "nps" ? "nps" : "csat"} />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function QuestionSelect({ label, value, onChange, options }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 min-w-0 flex-1 border-border bg-surface-card text-foreground sm:max-w-64">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {fieldLabel(f)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function significanceNote(test) {
  if (!test.reliable) return "Too few responses in some cells to test whether this difference is real.";
  return test.significant ? "This difference is statistically significant (95% confidence)." : "This difference could be chance (not significant at 95% confidence).";
}

// Compares answers to one question across the answers to another, as row percentages with a significance check.
function CrosstabCard({ fields, responses }) {
  const options = useMemo(() => crosstabFields(fields), [fields]);
  const [rowId, setRowId] = useState("");
  const [colId, setColId] = useState("");
  const rowField = options.find((f) => f.id === rowId) || options[0];
  const colField = options.find((f) => f.id === colId) || options.find((f) => f.id !== rowField?.id);
  const table = useMemo(() => (rowField && colField && rowField.id !== colField.id ? crosstab(rowField, colField, responses) : null), [rowField, colField, responses]);
  if (options.length < 2) return null;
  return (
    <SectionCard title="Compare answers" description="See how answers to one question differ by the answers to another.">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <QuestionSelect label="Compare by" value={rowField?.id} onChange={setRowId} options={options} />
        <span className="text-xs text-text-tertiary">against</span>
        <QuestionSelect label="Question" value={colField?.id} onChange={setColId} options={options} />
      </div>
      {table ? (
        <>
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-auto px-2 py-1.5" />
                  {table.cols.map((c) => <TableHead key={c} className="h-auto px-2 py-1.5 text-right text-xs font-medium normal-case tracking-normal text-text-tertiary">{c}</TableHead>)}
                  <TableHead className="h-auto px-2 py-1.5 text-right text-xs font-medium normal-case tracking-normal text-text-tertiary">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.rows.map((row) => (
                  <TableRow key={row} className="hover:bg-transparent">
                    <TableCell className="px-2 py-1.5 text-muted-foreground">{row}</TableCell>
                    {table.cols.map((c) => (
                      <TableCell key={c} className="px-2 py-1.5 text-right tabular-nums text-foreground">
                        {pct(table.grid[row][c], table.rowTotals[row])}% <span className="text-text-tertiary">({table.grid[row][c]})</span>
                      </TableCell>
                    ))}
                    <TableCell className="px-2 py-1.5 text-right tabular-nums text-text-secondary">{table.rowTotals[row]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-text-secondary">{significanceNote(table.test)}</p>
        </>
      ) : (
        <p className="text-xs text-text-tertiary">Pick two different questions.</p>
      )}
    </SectionCard>
  );
}

// Creates, copies, replaces or turns off the public link to this report.
function ShareReportDialog({ form, open, onOpenChange }) {
  const [state, setState] = useState({ loading: true, url: null, busy: false });
  const api = `/api/forms/${form.id}/report-share`;
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    callApi(api).then(({ ok, data }) => {
      if (active) setState({ loading: false, url: ok ? data.url : null, busy: false });
    });
    return () => {
      active = false;
    };
  }, [open, api]);
  const change = async (method, message) => {
    setState((s) => ({ ...s, busy: true }));
    const { ok, data } = await callApi(api, { method });
    setState((s) => ({ ...s, busy: false, url: ok ? data.url : s.url }));
    if (ok) toast.success(message);
    else toast.error(data?.error || "Couldn't update the link.");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share this report</DialogTitle>
          <DialogDescription>Anyone with the link can see charts for closed questions, with no sign-in. Written answers, sensitive questions and respondents&apos; details are never included, and it stays empty until {MIN_SHARED_RESPONSES} responses.</DialogDescription>
        </DialogHeader>
        {state.loading ? (
          <LoadingArea size={36} label="Loading the share link" className="py-6" />
        ) : state.url ? (
          <div className="grid gap-3">
            <CopyField value={state.url} label="Link copied" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" disabled={state.busy} onClick={() => change("POST", "New link created; the old one no longer works.")}>
                <RefreshCw />
                Replace link
              </Button>
              <Button type="button" variant="ghost" size="sm" disabled={state.busy} className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400" onClick={() => change("DELETE", "Sharing turned off.")}>
                <Link2Off />
                Turn off
              </Button>
            </div>
          </div>
        ) : (
          <DialogFooter>
            <Button type="button" disabled={state.busy} className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => change("POST", "Link created.")}>
              {state.busy ? <Loader2 className="animate-spin" /> : <Link2 />}
              Create link
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Per-question aggregates for one form (survey/poll/quiz report), trends, comparisons and sharing.
export function SurveyReport({ form, responses }) {
  const canShare = useCan("forms.response.export");
  const [sharing, setSharing] = useState(false);
  const fields = useMemo(() => canonicalFields(form), [form]);
  const aggregates = useMemo(
    () => answerFields(fields, { computed: true }).filter((f) => f.type !== "hidden").map((f) => aggregateField(f, responses, fields)),
    [fields, responses],
  );
  const quiz = useMemo(() => quizSummary(form, responses), [form, responses]);
  const currency = form?.settings?.payments?.currency || "usd";

  if (!responses.length) {
    return (
      <div className="rounded-xl border border-border bg-surface-subtle">
        <EmptyState icon={BarChart3} title="No data yet" description="The report fills in as responses arrive." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canShare ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setSharing(true)}>
            <Share2 />
            Share report
          </Button>
          <ShareReportDialog form={form} open={sharing} onOpenChange={setSharing} />
        </div>
      ) : null}
      {quiz && quiz.graded ? <QuizSummary quiz={quiz} passMark={form.settings.quiz.passMark} /> : null}
      <TrendsCard fields={fields} responses={responses} />
      <CrosstabCard fields={fields} responses={responses} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {aggregates.map((agg) => (
          <SectionCard
            key={agg.field.id}
            title={fieldLabel(agg.field)}
            description={`${fieldTypeLabel(agg.field.type)} · ${agg.answered} of ${agg.total} answered`}
            className={agg.kind === "matrix" || agg.kind === "text" ? "lg:col-span-2" : undefined}
          >
            <FieldReport agg={agg} currency={currency} />
          </SectionCard>
        ))}
      </div>
    </div>
  );
}

// Policy acknowledgements: who acknowledged, the typed name, and when.
export function AcknowledgementsReport({ form, responses }) {
  const rows = useMemo(
    () => responses.filter((r) => r.metadata?.policy?.acknowledgedAt).sort((a, b) => new Date(b.metadata.policy.acknowledgedAt) - new Date(a.metadata.policy.acknowledgedAt)),
    [responses],
  );
  const policy = form?.settings?.policy || {};
  return (
    <SectionCard
      title={policy.title || "Policy acknowledgements"}
      description={`${rows.length} of ${responses.length} respondents acknowledged${policy.url ? ` · ${policy.url}` : ""}`}
      bodyPadding={false}
    >
      {rows.length ? (
        <Table>
          <TableHeader className="bg-transparent">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-auto px-5 py-2.5 text-[11px] font-medium tracking-wide text-text-tertiary">Respondent</TableHead>
              <TableHead className="h-auto px-5 py-2.5 text-[11px] font-medium tracking-wide text-text-tertiary">Typed name</TableHead>
              <TableHead className="hidden h-auto px-5 py-2.5 text-[11px] font-medium tracking-wide text-text-tertiary sm:table-cell">Read to end</TableHead>
              <TableHead className="h-auto px-5 py-2.5 text-right text-[11px] font-medium tracking-wide text-text-tertiary">Acknowledged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} className="hover:bg-transparent">
                <TableCell className="px-5 py-3">
                  <p className="text-foreground">{r.name}</p>
                  <p className="text-xs text-text-tertiary">{r.email || "—"}</p>
                </TableCell>
                <TableCell className="px-5 py-3 text-muted-foreground">{r.metadata.policy.typedName || "—"}</TableCell>
                <TableCell className="hidden px-5 py-3 text-muted-foreground sm:table-cell">{r.metadata.policy.scrolled ? "Yes" : "No"}</TableCell>
                <TableCell className="px-5 py-3 text-right text-xs text-text-secondary">{formatDateTime(r.metadata.policy.acknowledgedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState icon={FileSignature} title="No acknowledgements yet" description="Respondents who acknowledge the policy appear here." />
      )}
    </SectionCard>
  );
}
