"use client";

import { useMemo } from "react";
import { BarChart3, FileSignature, GraduationCap } from "lucide-react";
import { EmptyState, SectionCard, StatGrid } from "@geiger/ui/screen-kit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@geiger/ui/table";
import { cn } from "@/lib/utils";
import { fieldTypeLabel, formatMoney } from "@/lib/forms/logic";
import { aggregateField, answerFields, canonicalFields, fieldLabel, quizSummary } from "@/lib/forms/response-utils";
import { formatDateTime } from "./constants";

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

function Bar({ value, max, className = "bg-sky-400/70" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-card">
      <div className={cn("h-full rounded-full transition-[width]", className)} style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
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

function FieldReport({ agg, currency }) {
  const money = (v) => (v == null ? "—" : agg.field.type === "currency" ? formatMoney(v, agg.field.config?.currency || currency) : v);
  switch (agg.kind) {
    case "distribution":
      return <Distribution counts={agg.counts} base={agg.answered} />;
    case "scale":
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Average" value={agg.avg} />
            <Metric label="Lowest" value={agg.min} />
            <Metric label="Highest" value={agg.max} />
          </div>
          <Columns counts={agg.counts} />
        </div>
      );
    case "nps": {
      const n = agg.promoters + agg.passives + agg.detractors;
      return (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <span className={cn("text-3xl font-bold tabular-nums", agg.nps == null ? "text-text-tertiary" : agg.nps >= 30 ? "text-emerald-400" : agg.nps >= 0 ? "text-amber-400" : "text-red-400")}>
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
            <span className="text-red-400">Detractors {agg.detractors} ({pct(agg.detractors, n)}%)</span>
            <span className="text-center text-amber-400">Passives {agg.passives} ({pct(agg.passives, n)}%)</span>
            <span className="text-right text-emerald-400">Promoters {agg.promoters} ({pct(agg.promoters, n)}%)</span>
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
              <Bar value={q.rate} max={100} className={q.rate >= 70 ? "bg-emerald-400/70" : q.rate >= 40 ? "bg-amber-400/70" : "bg-red-400/70"} />
            </li>
          ))}
        </ul>
      ) : null}
    </SectionCard>
  );
}

// Per-question aggregates for one form (survey/poll/quiz report).
export function SurveyReport({ form, responses }) {
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
      {quiz && quiz.graded ? <QuizSummary quiz={quiz} passMark={form.settings.quiz.passMark} /> : null}
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
