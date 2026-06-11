"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { ResponseDetailPanel } from "@/components/forms/response-detail-panel";
import { ArrowLeft, CheckCircle2, Loader2, Search, Star, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useResponses, labelAnswers } from "@/lib/hooks/use-responses";

const AVATAR_COLORS = ["bg-[#0e1e2e]", "bg-[#0d2218]", "bg-[#2a1a08]", "bg-[#1a0d2e]", "bg-surface-subtle", "bg-[#0d1e1a]"];

function buildVolume(responses) {
  const days = [];
  const counts = {};
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    days.push({ key, label });
    counts[key] = 0;
  }
  for (const r of responses) {
    const key = (r.submittedAt || "").slice(0, 10);
    if (key in counts) counts[key] += 1;
  }
  return days.map((d) => ({ day: d.label, responses: counts[d.key] }));
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_STYLE = {
  Complete:       { bg: "bg-[#0d2218]", text: "text-[#4ade80]", border: "border-[#166534]" },
  "Needs review": { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Pending:        { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const PRIORITY_STYLE = {
  High:   { bg: "bg-[#2a0808]", text: "text-[#f87171]", border: "border-[#7f1d1d]" },
  Medium: { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Low:    { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const volumeChartConfig = {
  responses: { label: "Responses", color: "#4a9eff" },
};

const statusChartConfig = {
  Complete:       { label: "Complete",      color: "#4ade80" },
  "Needs review": { label: "Needs review",  color: "#fb923c" },
  Pending:        { label: "Pending",       color: "#525252" },
};

function StatCard({ label, value, detail, Icon }) {
  return (
    <div className="rounded-md border border-border bg-surface-subtle p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-text-tertiary" />}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-text-secondary">{detail}</p>
    </div>
  );
}

function ResponseRow({ r, onClick }) {
  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.Pending;
  const p = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.Low;
  const fieldPreview = Object.entries(r.fields).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join("  ·  ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-surface-active px-4 py-3 text-left transition-colors hover:bg-surface-card last:border-0"
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-muted-foreground", r.avatarColor)}>
        {r.initials}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{r.name}</span>
          <span className="hidden truncate text-xs text-text-tertiary sm:block">{r.email}</span>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-text-tertiary">{fieldPreview}</p>
      </div>

      <span className="hidden max-w-[200px] truncate text-xs text-text-secondary sm:block">{r.submittedAt}</span>

      <span className="rounded bg-surface-card px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
        {r.score}
      </span>

      <span className={cn(
        "hidden rounded-full border px-2 py-0.5 text-[10px] font-medium sm:flex items-center gap-1",
        p.bg, p.text, p.border,
      )}>
        <Zap className="h-2.5 w-2.5" />
        {r.priority}
      </span>

      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", s.bg, s.text, s.border)}>
        {r.status}
      </span>
    </button>
  );
}

const FORM_STATUS_STYLE = {
  Published: "bg-[#0d2218] text-[#4ade80] border-[#166534]",
  Draft:     "bg-surface-active text-text-secondary border-border",
  Archived:  "bg-[#1c1917] text-[#78716c] border-[#44403c]",
};

export function FormResponsesScreen({ form, onBack }) {
  const { responses: rawResponses, loading } = useResponses({ formId: form.id });

  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("All");
  const [priorityFilter,  setPriorityFilter]  = useState("All");
  const [fieldFilter,     setFieldFilter]     = useState("");
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedIndex,   setSelectedIndex]   = useState(0);

  const responses = rawResponses.map((r, i) => ({
    ...r,
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
    submittedAt: formatDateTime(r.submittedAt),
    fields: labelAnswers(r.answers, form.fieldDefs),
  }));
  const volumeData = buildVolume(rawResponses);

  const filtered = responses.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "All"   && r.status   !== statusFilter)   return false;
    if (priorityFilter !== "All" && r.priority !== priorityFilter) return false;
    if (fieldFilter) {
      const allValues = Object.values(r.fields).join(" ").toLowerCase();
      if (!allValues.includes(fieldFilter.toLowerCase())) return false;
    }
    return true;
  });

  const total          = responses.length;
  const complete       = responses.filter((r) => r.status === "Complete").length;
  const highPriority   = responses.filter((r) => r.priority === "High").length;
  const scored         = responses.filter((r) => Number.isFinite(r.score));
  const avgScore       = scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length) : 0;
  const completionPct  = total ? Math.round((complete / total) * 100) : 0;

  const statusCounts = [
    { name: "Complete",      value: responses.filter((r) => r.status === "Complete").length,      fill: "#4ade80" },
    { name: "Needs review",  value: responses.filter((r) => r.status === "Needs review").length,  fill: "#fb923c" },
    { name: "Pending",       value: responses.filter((r) => r.status === "Pending").length,       fill: "#525252" },
  ];

  const chartData = volumeData;

  const STATUS_TABS    = ["All", "Complete", "Needs review", "Pending"];
  const PRIORITY_TABS  = ["All", "High", "Medium", "Low"];

  const formStatusClass = FORM_STATUS_STYLE[form.status] ?? FORM_STATUS_STYLE.Draft;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-foreground">

      <div className="flex items-start gap-3 border-b border-border pb-5">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface-subtle text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
          aria-label="Back to forms"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">{form.name}</h1>
          <p className="mt-0.5 text-xs text-text-secondary">
            {total} response{total !== 1 ? "s" : ""}&nbsp;·&nbsp;{form.status}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-medium", formStatusClass)}>
            {form.status}
          </span>
          <Link
            href={`/forms/${form.slug}`}
            className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-subtle px-3 text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            Open builder
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total responses"
          value={total}
          detail={`${filtered.length} matching current filters`}
          Icon={CheckCircle2}
        />
        <StatCard
          label="Completion"
          value={`${completionPct}%`}
          detail={`${complete} of ${total} complete`}
          Icon={Timer}
        />
        <StatCard
          label="Avg score"
          value={avgScore}
          detail="Based on triage scoring"
          Icon={Star}
        />
        <StatCard
          label="High priority"
          value={highPriority}
          detail={`${total ? Math.round((highPriority / total) * 100) : 0}% of all responses`}
          Icon={Zap}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <div className="rounded-md border border-border bg-surface-subtle p-5 lg:col-span-2">
          <p className="text-sm font-medium text-white">Response volume</p>
          <p className="mt-0.5 text-xs text-text-secondary">Last 7 days</p>
          <ChartContainer config={volumeChartConfig} className="mt-4 h-[180px] w-full">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="formResponseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4a9eff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4a9eff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#737373", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="responses"
                stroke="#4a9eff"
                strokeWidth={2}
                fill="url(#formResponseGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#4a9eff", strokeWidth: 0 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="rounded-md border border-border bg-surface-subtle p-5">
          <p className="text-sm font-medium text-white">Status breakdown</p>
          <p className="mt-0.5 text-xs text-text-secondary">All responses</p>
          <ChartContainer config={statusChartConfig} className="mt-2 h-[180px] w-full">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent formatter={(value, name) => [value, name]} />
                }
              />
              <Pie
                data={statusCounts}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                strokeWidth={0}
              >
                {statusCounts.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="mt-1 space-y-1.5">
            {statusCounts.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
                <span className="text-xs font-medium tabular-nums text-foreground">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email..."
            className="h-7 w-44 pl-8 pr-3 text-xs text-muted-foreground"
          />
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
          <Input
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            placeholder="Filter by field value..."
            className="h-7 w-48 pl-8 pr-3 text-xs text-muted-foreground"
          />
        </div>

        <div className="h-4 w-px bg-surface-hover" />

        <div className="flex items-center gap-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                statusFilter === tab
                  ? "bg-surface-hover text-white"
                  : "text-text-secondary hover:text-muted-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-surface-hover" />

        <div className="flex items-center gap-0.5">
          {PRIORITY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPriorityFilter(tab)}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                priorityFilter === tab
                  ? "bg-surface-hover text-white"
                  : "text-text-secondary hover:text-muted-foreground",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="ml-auto text-[11px] text-text-tertiary">
          {filtered.length} of {total}
        </span>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-surface-subtle">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 border-b border-border px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
          <span className="w-8" />
          <span>Respondent</span>
          <span className="hidden sm:block">Submitted</span>
          <span>Score</span>
          <span className="hidden sm:block">Priority</span>
          <span>Status</span>
        </div>

        {filtered.map((r, i) => (
          <ResponseRow
            key={r.id}
            r={r}
            index={i}
            onClick={() => {
              setSelectedResponse(r);
              setSelectedIndex(i);
            }}
          />
        ))}

        {filtered.length === 0 && (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-text-secondary">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading responses…
              </>
            ) : total === 0 ? (
              "No responses yet for this form."
            ) : (
              "No responses match your filters."
            )}
          </div>
        )}
      </div>

      {selectedResponse && (
        <ResponseDetailPanel
          response={{ ...selectedResponse, form: form.name }}
          index={selectedIndex}
          onClose={() => setSelectedResponse(null)}
          score={selectedResponse.score}
          priority={selectedResponse.priority}
        />
      )}
    </div>
  );
}
