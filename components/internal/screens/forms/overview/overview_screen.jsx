"use client";

import { useMemo } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormsScreenShell, LoadingState } from "../screen-shell";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Inbox,
  TrendingUp,
  Users,
} from "lucide-react";
import { useForms } from "@/lib/hooks/use-forms";
import { useResponses } from "@/lib/hooks/use-responses";
import { summarizeResponses } from "@/lib/supabase/responses";
import { relativeTime } from "@/lib/forms/schema";

const STATUS_COLORS = {
  Complete: "#4ade80",
  "Needs review": "#fb923c",
  Pending: "#60a5fa",
};

const PRIORITY_COLORS = {
  High: "#f87171",
  Medium: "#fbbf24",
  Low: "#737373",
};

function dayKey(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildDailySeries(responses, days = 14) {
  const buckets = [];
  const index = new Map();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const entry = {
      key: dayKey(d),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      responses: 0,
    };
    index.set(entry.key, entry);
    buckets.push(entry);
  }

  for (const r of responses) {
    if (!r.submittedAt) continue;
    const entry = index.get(dayKey(r.submittedAt));
    if (entry) entry.responses += 1;
  }

  buckets.forEach((b, i) => {
    const window = buckets.slice(Math.max(0, i - 6), i + 1);
    const sum = window.reduce((acc, x) => acc + x.responses, 0);
    b.avg = Math.round((sum / window.length) * 10) / 10;
  });

  return buckets;
}

function aggregateForms(forms, responses) {
  const byForm = new Map();
  for (const r of responses) {
    if (!byForm.has(r.formId)) {
      byForm.set(r.formId, { total: 0, complete: 0, needsReview: 0, pending: 0, scoreSum: 0, scoreCount: 0, lastAt: 0 });
    }
    const agg = byForm.get(r.formId);
    agg.total += 1;
    if (r.status === "Complete") agg.complete += 1;
    else if (r.status === "Needs review") agg.needsReview += 1;
    else if (r.status === "Pending") agg.pending += 1;
    if (typeof r.score === "number") {
      agg.scoreSum += r.score;
      agg.scoreCount += 1;
    }
    const t = r.submittedAt ? new Date(r.submittedAt).getTime() : 0;
    if (t && t > agg.lastAt) agg.lastAt = t;
  }

  return forms
    .map((f) => {
      const agg = byForm.get(f.id) || { total: 0, complete: 0, needsReview: 0, pending: 0, scoreSum: 0, scoreCount: 0, lastAt: 0 };
      return {
        id: f.id,
        name: f.name,
        status: f.status,
        category: f.category,
        total: agg.total,
        completion: agg.total ? Math.round((agg.complete / agg.total) * 100) : null,
        needsReview: agg.needsReview,
        avgScore: agg.scoreCount ? Math.round(agg.scoreSum / agg.scoreCount) : null,
        lastAt: agg.lastAt,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function buildCounts(forms, responses) {
  const now = Date.now();
  const dayMs = 86_400_000;
  const todayKey = dayKey(new Date());
  let submittedToday = 0;
  let last7 = 0;
  for (const r of responses) {
    if (!r.submittedAt) continue;
    if (dayKey(r.submittedAt) === todayKey) submittedToday += 1;
    if (now - new Date(r.submittedAt).getTime() <= 7 * dayMs) last7 += 1;
  }
  return {
    published: forms.filter((f) => f.status === "Published").length,
    drafts: forms.filter((f) => f.status === "Draft").length,
    archived: forms.filter((f) => f.status === "Archived").length,
    submittedToday,
    last7,
  };
}

function getCompletionColor(pct) {
  if (pct == null) return "#525252";
  if (pct >= 85) return "#4ade80";
  if (pct >= 70) return "#60a5fa";
  if (pct >= 50) return "#fbbf24";
  return "#f87171";
}

function getStatusClass(status) {
  const styles = {
    Published: "border-[#166534] bg-[#0d2218] text-[#4ade80]",
    Draft: "border-[#3f3f46] bg-[#242424] text-[#a3a3a3]",
    Archived: "border-[#44403c] bg-[#1c1917] text-[#a8a29e]",
  };
  return styles[status] || styles.Draft;
}

function MetricCard({ icon: Icon, label, value, detail, tone = "neutral" }) {
  const tones = {
    neutral: "text-[#737373]",
    good: "text-[#4ade80]",
    warn: "text-[#fbbf24]",
    info: "text-[#60a5fa]",
  };

  return (
    <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-[#737373]">{label}</p>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${tones[tone]}`} />}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-[#737373]">{detail}</p>
    </div>
  );
}

function CardShell({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`flex flex-col rounded-md border border-[#2a2a2a] bg-[#1a1a1a] ${className}`}>
      <div className="flex items-start justify-between gap-2 border-b border-[#2a2a2a] px-4 py-3.5">
        <div>
          <h2 className="text-sm font-medium text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-[#737373]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  );
}

function EmptyChart({ label = "No data in this range yet" }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 text-center">
      <Inbox className="h-5 w-5 text-[#3a3a3a]" />
      <p className="text-xs text-[#525252]">{label}</p>
    </div>
  );
}

function SubmissionsTrend({ data, total }) {
  const config = {
    responses: { label: "Submissions", color: "#60a5fa" },
    avg: { label: "7-day avg", color: "#fbbf24" },
  };

  return (
    <CardShell
      title="Submissions trend"
      subtitle="Daily responses over the last 14 days, with 7-day average"
      className="lg:col-span-3"
      action={
        <span className="flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#202020] px-2.5 py-1 text-[11px] font-medium text-[#a3a3a3]">
          <TrendingUp className="h-3 w-3 text-[#60a5fa]" />
          {total.toLocaleString()} total
        </span>
      }
    >
      {total === 0 ? (
        <EmptyChart label="No submissions yet" />
      ) : (
        <ChartContainer config={config} className="h-72 w-full">
          <ComposedChart data={data} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="overviewResponses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="responses" stroke="#60a5fa" strokeWidth={2} fill="url(#overviewResponses)" dot={false} activeDot={{ r: 4, fill: "#60a5fa", strokeWidth: 0 }} />
            <Line type="monotone" dataKey="avg" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}

function StatusBreakdown({ data, total }) {
  const config = Object.fromEntries(
    Object.entries(STATUS_COLORS).map(([k, color]) => [k, { label: k, color }]),
  );

  return (
    <CardShell title="Response status" subtitle="Triage state of all responses" className="lg:col-span-2">
      {total === 0 ? (
        <EmptyChart label="No responses to triage" />
      ) : (
        <>
          <ChartContainer config={config} className="mx-auto h-44 w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [`${value} (${Math.round((value / total) * 100)}%)`, name]} />} />
              <Pie data={data} cx="50%" cy="50%" innerRadius={46} outerRadius={72} dataKey="value" nameKey="name" strokeWidth={0} paddingAngle={2}>
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-2 space-y-1.5">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-[#a3a3a3]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
                  {entry.name}
                </span>
                <span className="tabular-nums text-[#e7e7e7]">
                  {entry.value} · {Math.round((entry.value / total) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </CardShell>
  );
}

function TopFormsChart({ data }) {
  const config = { total: { label: "Submissions", color: "#60a5fa" } };

  return (
    <CardShell title="Top forms by submissions" subtitle="Where responses are actually coming in">
      {data.length === 0 ? (
        <EmptyChart label="No submissions yet" />
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => [`${value} submissions${item?.payload?.completion != null ? ` · ${item.payload.completion}% complete` : ""}`, item?.payload?.name]} />} />
            <Bar dataKey="total" radius={[0, 3, 3, 0]} maxBarSize={18}>
              {data.map((entry) => (
                <Cell key={entry.id} fill={getCompletionColor(entry.completion)} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}

function PriorityBreakdown({ data, total, needsReview }) {
  const config = { count: { label: "Responses", color: "#60a5fa" } };

  return (
    <CardShell
      title="Incoming priority"
      subtitle="Priority of responses and current review load"
      action={
        <span className="flex items-center gap-1.5 rounded-full border border-[#7c2d12] bg-[#2a1a08] px-2.5 py-1 text-[11px] font-medium text-[#fb923c]">
          <AlertCircle className="h-3 w-3" />
          {needsReview} to review
        </span>
      }
    >
      {total === 0 ? (
        <EmptyChart label="No responses yet" />
      ) : (
        <ChartContainer config={config} className="h-64 w-full">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name, item) => [`${value} responses`, item?.payload?.name]} />} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={30}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      )}
    </CardShell>
  );
}

function TopFormsTable({ rows }) {
  return (
    <section className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="flex flex-col gap-1 border-b border-[#2a2a2a] px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Form performance</h2>
          <p className="mt-1 text-xs text-[#737373]">Submissions, completion, review load, and last activity by form</p>
        </div>
        <p className="text-xs text-[#525252]">{rows.length} form{rows.length === 1 ? "" : "s"}</p>
      </div>
      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-xs text-[#525252]">
            No forms yet — create one to start collecting responses.
          </div>
        ) : (
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Form</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead className="text-right">Needs review</TableHead>
                <TableHead className="text-right">Avg score</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="w-[34%]">
                    <div className="flex items-center gap-2.5">
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusClass(form.status)}`}>
                        {form.status}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#f5f5f5]">{form.name}</p>
                        {form.category && <p className="mt-0.5 truncate text-[10px] text-[#737373]">{form.category}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium tabular-nums text-[#e7e7e7]">{form.total.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    {form.completion == null ? (
                      <span className="text-xs text-[#525252]">—</span>
                    ) : (
                      <div className="flex min-w-32 items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-[#2a2a2a]">
                          <div className="h-1.5 rounded-full" style={{ width: `${form.completion}%`, backgroundColor: getCompletionColor(form.completion) }} />
                        </div>
                        <span className="w-9 text-right text-xs font-medium tabular-nums text-[#e7e7e7]">{form.completion}%</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-medium tabular-nums ${form.needsReview > 0 ? "text-[#fb923c]" : "text-[#525252]"}`}>
                      {form.needsReview || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm tabular-nums text-[#a3a3a3]">{form.avgScore == null ? "—" : form.avgScore}</span>
                  </TableCell>
                  <TableCell>
                    {form.lastAt ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#737373]">
                        <Clock3 className="h-3 w-3" />
                        {relativeTime(new Date(form.lastAt).toISOString())}
                      </span>
                    ) : (
                      <span className="text-xs text-[#525252]">No responses</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </section>
  );
}

export function OverviewScreen() {
  const { forms, loading: formsLoading } = useForms();
  const { responses, loading: responsesLoading } = useResponses();

  const summary = useMemo(() => summarizeResponses(responses), [responses]);
  const dailySeries = useMemo(() => buildDailySeries(responses, 14), [responses]);
  const formAggregates = useMemo(() => aggregateForms(forms, responses), [forms, responses]);

  const counts = useMemo(() => buildCounts(forms, responses), [forms, responses]);

  const statusData = useMemo(
    () =>
      Object.entries(summary.byStatus)
        .filter(([, value]) => value > 0)
        .map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || "#737373" })),
    [summary],
  );

  const priorityData = useMemo(
    () =>
      ["High", "Medium", "Low"].map((name) => ({
        name,
        count: summary.byPriority[name] || 0,
        fill: PRIORITY_COLORS[name],
      })),
    [summary],
  );

  const topForms = useMemo(() => formAggregates.filter((f) => f.total > 0).slice(0, 6), [formAggregates]);

  if (formsLoading || responsesLoading) {
    return (
      <FormsScreenShell title="Overview">
        <LoadingState label="Crunching your workspace metrics…" />
      </FormsScreenShell>
    );
  }

  return (
    <FormsScreenShell title="Overview">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          icon={FileText}
          label="Published forms"
          value={String(counts.published)}
          detail={`${counts.drafts} draft${counts.drafts === 1 ? "" : "s"} · ${counts.archived} archived`}
          tone="info"
        />
        <MetricCard
          icon={Users}
          label="Responses"
          value={summary.total.toLocaleString()}
          detail={`+${counts.submittedToday} today · ${counts.last7} this week`}
          tone="good"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Completion rate"
          value={`${summary.completePct}%`}
          detail={`${summary.byStatus.Complete} of ${summary.total || 0} complete`}
          tone="good"
        />
        <MetricCard
          icon={AlertCircle}
          label="Needs review"
          value={String(summary.byStatus["Needs review"])}
          detail={`${summary.byStatus.Pending} pending · ${summary.respondents} respondents`}
          tone="warn"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <SubmissionsTrend data={dailySeries} total={summary.total} />
        <StatusBreakdown data={statusData} total={summary.total} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TopFormsChart data={topForms} />
        <PriorityBreakdown data={priorityData} total={summary.total} needsReview={summary.byStatus["Needs review"]} />
      </div>

      <TopFormsTable rows={formAggregates} />
    </FormsScreenShell>
  );
}
