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
import { ArrowLeft, CheckCircle2, Search, Star, Timer, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const slugify = (s) => s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

// ─── Mock data ────────────────────────────────────────────────────────────────

const FORM_RESPONSES = {
  1: [
    { id: "r1-1", name: "Maya Patel",    email: "maya@example.com",       initials: "MP", avatarColor: "bg-[#0e1e2e]", status: "Complete",     priority: "High",   score: 92, received: "2 min ago",   submittedAt: "May 24, 2026 · 14:32", fields: { Company: "Acme Corp", "Use case": "B2B SaaS", "Team size": "50–200", Budget: "$5k–$10k/mo", Timeline: "Q3 2026", Message: "Looking to automate our onboarding flow." } },
    { id: "r1-2", name: "Priya Shah",    email: "priya@acme.io",          initials: "PS", avatarColor: "bg-[#0d2218]", status: "Needs review", priority: "High",   score: 85, received: "1 hr ago",    submittedAt: "May 24, 2026 · 13:15", fields: { Company: "Nexus AI", "Use case": "Internal ops", "Team size": "200+", Budget: "$10k+/mo", Timeline: "Q2 2026", Message: "Urgent integration needed." } },
    { id: "r1-3", name: "Raj Kumar",     email: "raj@techsync.in",        initials: "RK", avatarColor: "bg-[#1a0d2e]", status: "Needs review", priority: "Medium", score: 78, received: "2 days ago",  submittedAt: "May 22, 2026 · 10:05", fields: { Company: "TechSync", "Use case": "Client portal", "Team size": "10–50", Budget: "$1k–$5k/mo", Timeline: "Q4 2026", Message: "Open to a pilot program." } },
    { id: "r1-4", name: "Aiko Tanaka",   email: "aiko@futureco.jp",       initials: "AT", avatarColor: "bg-[#0d1e1a]", status: "Complete",     priority: "Medium", score: 71, received: "3 days ago",  submittedAt: "May 21, 2026 · 09:44", fields: { Company: "FutureCo", "Use case": "Partner integrations", "Team size": "50–200", Budget: "$5k–$10k/mo", Timeline: "Q3 2026", Message: "Interested in API access." } },
    { id: "r1-5", name: "Leon Müller",   email: "leon@softhaus.de",       initials: "LM", avatarColor: "bg-[#1e1c0e]", status: "Pending",      priority: "Low",    score: 34, received: "5 days ago",  submittedAt: "May 19, 2026 · 16:20", fields: { Company: "Softhaus GmbH", "Use case": "Unsure", "Team size": "1–10", Budget: "< $1k/mo", Timeline: "Not yet defined", Message: "Just exploring options." } },
    { id: "r1-6", name: "Sara Bloom",    email: "sara@bloomventures.com", initials: "SB", avatarColor: "bg-[#1a1a1a]", status: "Complete",     priority: "High",   score: 95, received: "1 week ago",  submittedAt: "May 17, 2026 · 11:00", fields: { Company: "Bloom Ventures", "Use case": "Investor reporting", "Team size": "10–50", Budget: "$10k+/mo", Timeline: "Q2 2026", Message: "Need white-label support." } },
  ],
  3: [
    { id: "r3-1", name: "Jon Bell",       email: "jon@example.com",     initials: "JB", avatarColor: "bg-[#0e1e2e]", status: "Complete",     priority: "Medium", score: 67, received: "18 min ago",  submittedAt: "May 24, 2026 · 14:16", fields: { Event: "Product Summit 2026", Seats: "2", "Dietary req.": "Vegetarian", "T-shirt size": "M", "Arrival day": "May 28" } },
    { id: "r3-2", name: "Anna Torres",    email: "anna@example.com",    initials: "AT", avatarColor: "bg-[#0d2218]", status: "Pending",      priority: "Low",    score: 28, received: "Yesterday",   submittedAt: "May 23, 2026 · 17:44", fields: { Event: "Product Summit 2026", Seats: "1", "Dietary req.": "None", "T-shirt size": "S", "Arrival day": "May 29" } },
    { id: "r3-3", name: "Carlos Vega",    email: "carlos@venga.mx",     initials: "CV", avatarColor: "bg-[#1a0d2e]", status: "Complete",     priority: "Medium", score: 55, received: "2 days ago",  submittedAt: "May 22, 2026 · 08:30", fields: { Event: "Product Summit 2026", Seats: "4", "Dietary req.": "Halal", "T-shirt size": "L", "Arrival day": "May 28" } },
    { id: "r3-4", name: "Fatima Al-Amin", email: "fatima@corp.ae",      initials: "FA", avatarColor: "bg-[#0d1e1a]", status: "Complete",     priority: "High",   score: 88, received: "3 days ago",  submittedAt: "May 21, 2026 · 13:00", fields: { Event: "Product Summit 2026", Seats: "6", "Dietary req.": "Halal", "T-shirt size": "XS", "Arrival day": "May 27" } },
    { id: "r3-5", name: "Wei Zhang",      email: "wei@ztech.cn",        initials: "WZ", avatarColor: "bg-[#1e1c0e]", status: "Needs review", priority: "Medium", score: 61, received: "4 days ago",  submittedAt: "May 20, 2026 · 10:15", fields: { Event: "Product Summit 2026", Seats: "2", "Dietary req.": "Vegan", "T-shirt size": "L", "Arrival day": "May 28" } },
  ],
  4: [
    { id: "r4-1", name: "Sam Chen",   email: "sam@example.com",   initials: "SC", avatarColor: "bg-[#0e1e2e]", status: "Complete",     priority: "Medium", score: 45, received: "3 hrs ago",   submittedAt: "May 24, 2026 · 11:10", fields: { Role: "Product Manager", "Company size": "51–200", "Heard about": "LinkedIn", "Main goal": "Streamline processes", "Feature interest": "Integrations, Analytics" } },
    { id: "r4-2", name: "Nadia Osei", email: "nadia@kinetics.gh", initials: "NO", avatarColor: "bg-[#0d2218]", status: "Complete",     priority: "Low",    score: 60, received: "Yesterday",   submittedAt: "May 23, 2026 · 15:00", fields: { Role: "Operations Lead", "Company size": "11–50", "Heard about": "Word of mouth", "Main goal": "Reduce manual work", "Feature interest": "Forms, Automation" } },
    { id: "r4-3", name: "Ben Carter", email: "ben@startfast.io",  initials: "BC", avatarColor: "bg-[#1a0d2e]", status: "Needs review", priority: "Medium", score: 72, received: "2 days ago",  submittedAt: "May 22, 2026 · 09:20", fields: { Role: "CEO", "Company size": "1–10", "Heard about": "Product Hunt", "Main goal": "Scale faster", "Feature interest": "All features" } },
  ],
  6: [
    { id: "r6-1", name: "Elena Ross", email: "elena@partnerco.eu", initials: "ER", avatarColor: "bg-[#0e1e2e]", status: "Complete",     priority: "High",   score: 89, received: "1 week ago",  submittedAt: "May 17, 2026 · 10:30", fields: { "Company name": "PartnerCo EU", "Partnership type": "Reseller", Region: "EMEA", "Annual revenue": "€2M–€5M", "Why partner": "Strong pipeline in enterprise segment." } },
    { id: "r6-2", name: "Tom Nguyen", email: "tom@technex.sg",     initials: "TN", avatarColor: "bg-[#0d2218]", status: "Needs review", priority: "Medium", score: 74, received: "10 days ago", submittedAt: "May 14, 2026 · 14:00", fields: { "Company name": "TechNex SG", "Partnership type": "Technology", Region: "APAC", "Annual revenue": "$1M–$2M", "Why partner": "Complementary product for SEA market." } },
  ],
};

const VOLUME_DATA = {
  1: [{ d: "May 18", r: 12 }, { d: "May 19", r: 18 }, { d: "May 20", r: 9 },  { d: "May 21", r: 22 }, { d: "May 22", r: 17 }, { d: "May 23", r: 28 }, { d: "May 24", r: 22 }],
  3: [{ d: "May 18", r: 40 }, { d: "May 19", r: 55 }, { d: "May 20", r: 32 }, { d: "May 21", r: 61 }, { d: "May 22", r: 48 }, { d: "May 23", r: 72 }, { d: "May 24", r: 34 }],
  4: [{ d: "May 18", r: 8 },  { d: "May 19", r: 11 }, { d: "May 20", r: 6 },  { d: "May 21", r: 14 }, { d: "May 22", r: 9 },  { d: "May 23", r: 10 }, { d: "May 24", r: 6 }],
  6: [{ d: "May 18", r: 2 },  { d: "May 19", r: 3 },  { d: "May 20", r: 1 },  { d: "May 21", r: 4 },  { d: "May 22", r: 2 },  { d: "May 23", r: 3 },  { d: "May 24", r: 3 }],
};

const DEFAULT_RESPONSES = [];
const DEFAULT_VOLUME = [
  { d: "May 18", r: 0 }, { d: "May 19", r: 0 }, { d: "May 20", r: 0 },
  { d: "May 21", r: 0 }, { d: "May 22", r: 0 }, { d: "May 23", r: 0 }, { d: "May 24", r: 0 },
];

// ─── Style maps ───────────────────────────────────────────────────────────────

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

// ─── Chart configs ────────────────────────────────────────────────────────────

const volumeChartConfig = {
  responses: { label: "Responses", color: "#4a9eff" },
};

const statusChartConfig = {
  Complete:       { label: "Complete",      color: "#4ade80" },
  "Needs review": { label: "Needs review",  color: "#fb923c" },
  Pending:        { label: "Pending",       color: "#525252" },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, detail, Icon }) {
  return (
    <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#525252]">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-[#525252]" />}
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-[#737373]">{detail}</p>
    </div>
  );
}

// ─── Response row ─────────────────────────────────────────────────────────────

function ResponseRow({ r, onClick }) {
  const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.Pending;
  const p = PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.Low;
  const fieldPreview = Object.entries(r.fields).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join("  ·  ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-4 border-b border-[#242424] px-4 py-3 text-left transition-colors hover:bg-[#202020] last:border-0"
    >
      {/* Avatar */}
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-[#d4d4d4]", r.avatarColor)}>
        {r.initials}
      </div>

      {/* Name + email + field preview */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#e7e7e7]">{r.name}</span>
          <span className="hidden truncate text-xs text-[#525252] sm:block">{r.email}</span>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-[#525252]">{fieldPreview}</p>
      </div>

      {/* Submitted at — hidden on mobile */}
      <span className="hidden max-w-[200px] truncate text-xs text-[#737373] sm:block">{r.submittedAt}</span>

      {/* Score */}
      <span className="rounded bg-[#202020] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[#a3a3a3]">
        {r.score}
      </span>

      {/* Priority badge */}
      <span className={cn(
        "hidden rounded-full border px-2 py-0.5 text-[10px] font-medium sm:flex items-center gap-1",
        p.bg, p.text, p.border,
      )}>
        <Zap className="h-2.5 w-2.5" />
        {r.priority}
      </span>

      {/* Status badge */}
      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", s.bg, s.text, s.border)}>
        {r.status}
      </span>
    </button>
  );
}

// ─── Form status badge ────────────────────────────────────────────────────────

const FORM_STATUS_STYLE = {
  Published: "bg-[#0d2218] text-[#4ade80] border-[#166534]",
  Draft:     "bg-[#242424] text-[#737373] border-[#333333]",
  Archived:  "bg-[#1c1917] text-[#78716c] border-[#44403c]",
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export function FormResponsesScreen({ form, onBack }) {
  const responses  = FORM_RESPONSES[form.id] ?? DEFAULT_RESPONSES;
  const volumeData = VOLUME_DATA[form.id]    ?? DEFAULT_VOLUME;

  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("All");
  const [priorityFilter,  setPriorityFilter]  = useState("All");
  const [fieldFilter,     setFieldFilter]     = useState("");
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [selectedIndex,   setSelectedIndex]   = useState(0);

  // ── Filtering ──────────────────────────────────────────────────────────────

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

  // ── Analytics ──────────────────────────────────────────────────────────────

  const total          = responses.length;
  const complete       = responses.filter((r) => r.status === "Complete").length;
  const highPriority   = responses.filter((r) => r.priority === "High").length;
  const avgScore       = total ? Math.round(responses.reduce((s, r) => s + r.score, 0) / total) : 0;
  const completionPct  = total ? Math.round((complete / total) * 100) : 0;

  const statusCounts = [
    { name: "Complete",      value: responses.filter((r) => r.status === "Complete").length,      fill: "#4ade80" },
    { name: "Needs review",  value: responses.filter((r) => r.status === "Needs review").length,  fill: "#fb923c" },
    { name: "Pending",       value: responses.filter((r) => r.status === "Pending").length,       fill: "#525252" },
  ];

  const chartData = volumeData.map((d) => ({ day: d.d, responses: d.r }));

  // ── Status filter buttons ──────────────────────────────────────────────────

  const STATUS_TABS    = ["All", "Complete", "Needs review", "Pending"];
  const PRIORITY_TABS  = ["All", "High", "Medium", "Low"];

  const formStatusClass = FORM_STATUS_STYLE[form.status] ?? FORM_STATUS_STYLE.Draft;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 text-[#e7e7e7]">

      {/* ── 1. Header ── */}
      <div className="flex items-start gap-3 border-b border-[#2a2a2a] pb-5">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-[#737373] transition-colors hover:border-[#474747] hover:text-white"
          aria-label="Back to forms"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-white">{form.name}</h1>
          <p className="mt-0.5 text-xs text-[#737373]">
            {total} response{total !== 1 ? "s" : ""}&nbsp;·&nbsp;{form.status}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-medium", formStatusClass)}>
            {form.status}
          </span>
          <Link
            href={`/forms/${slugify(form.name)}`}
            className="flex h-8 items-center gap-1.5 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-xs text-[#a3a3a3] transition-colors hover:border-[#474747] hover:text-white"
          >
            Open builder
          </Link>
        </div>
      </div>

      {/* ── 2. Stat cards ── */}
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

      {/* ── 3. Charts row ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Area chart — response volume */}
        <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-5 lg:col-span-2">
          <p className="text-sm font-medium text-white">Response volume</p>
          <p className="mt-0.5 text-xs text-[#737373]">Last 7 days</p>
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

        {/* Donut — status breakdown */}
        <div className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a] p-5">
          <p className="text-sm font-medium text-white">Status breakdown</p>
          <p className="mt-0.5 text-xs text-[#737373]">All responses</p>
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
          {/* Legend */}
          <div className="mt-1 space-y-1.5">
            {statusCounts.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.fill }} />
                  <span className="text-xs text-[#a3a3a3]">{entry.name}</span>
                </div>
                <span className="text-xs font-medium tabular-nums text-[#e7e7e7]">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. Filters bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search by name / email */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email..."
            className="h-7 w-44 pl-8 pr-3 text-xs text-[#d4d4d4]"
          />
        </div>

        {/* Search by field value */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#525252]" />
          <Input
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            placeholder="Filter by field value..."
            className="h-7 w-48 pl-8 pr-3 text-xs text-[#d4d4d4]"
          />
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#2a2a2a]" />

        {/* Status filter */}
        <div className="flex items-center gap-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                statusFilter === tab
                  ? "bg-[#2a2a2a] text-white"
                  : "text-[#737373] hover:text-[#a3a3a3]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#2a2a2a]" />

        {/* Priority filter */}
        <div className="flex items-center gap-0.5">
          {PRIORITY_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setPriorityFilter(tab)}
              className={cn(
                "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                priorityFilter === tab
                  ? "bg-[#2a2a2a] text-white"
                  : "text-[#737373] hover:text-[#a3a3a3]",
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Result count */}
        <span className="ml-auto text-[11px] text-[#525252]">
          {filtered.length} of {total}
        </span>
      </div>

      {/* ── 5. Response list ── */}
      <div className="overflow-hidden rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 border-b border-[#2a2a2a] px-4 py-2 text-[10px] font-medium uppercase tracking-wide text-[#525252]">
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
          <div className="flex min-h-32 items-center justify-center text-sm text-[#737373]">
            No responses match your filters.
          </div>
        )}
      </div>

      {/* ── 6. Detail panel ── */}
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
