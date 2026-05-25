"use client";

import {
  Area,
  AreaChart,
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
import { FormsScreenShell } from "../screen-shell";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  MousePointerClick,
  TrendingUp,
  Users,
} from "lucide-react";

const responseVolumeData = [
  { day: "May 18", views: 306, starts: 198, responses: 124 },
  { day: "May 19", views: 342, starts: 214, responses: 131 },
  { day: "May 20", views: 288, starts: 177, responses: 118 },
  { day: "May 21", views: 410, starts: 264, responses: 142 },
  { day: "May 22", views: 392, starts: 249, responses: 137 },
  { day: "May 23", views: 468, starts: 307, responses: 155 },
  { day: "May 24", views: 434, starts: 281, responses: 129 },
];

const conversionByFormData = [
  { form: "Event Registration", rate: 91, target: 80 },
  { form: "Customer Intake", rate: 82, target: 80 },
  { form: "Onboarding", rate: 74, target: 80 },
  { form: "Support Request", rate: 68, target: 80 },
  { form: "Partner Application", rate: 65, target: 80 },
];

const channelData = [
  { name: "Direct link", value: 384, fill: "#60a5fa" },
  { name: "Email", value: 248, fill: "#4ade80" },
  { name: "Embed", value: 176, fill: "#fbbf24" },
  { name: "QR code", value: 88, fill: "#fb7185" },
];

const backlogData = [
  { queue: "New", count: 42, fill: "#60a5fa" },
  { queue: "Needs review", count: 31, fill: "#fb923c" },
  { queue: "Flagged", count: 9, fill: "#f87171" },
  { queue: "Approved", count: 188, fill: "#4ade80" },
];

const topFormsData = [
  {
    name: "Event Registration",
    owner: "Events",
    status: "Published",
    responses: 342,
    views: 1200,
    completion: 91,
    review: 12,
    trend: "+18%",
    updated: "May 23",
    insight: "Strongest performer; attendee cap is the next constraint.",
  },
  {
    name: "Customer Intake",
    owner: "Sales",
    status: "Published",
    responses: 128,
    views: 980,
    completion: 82,
    review: 18,
    trend: "+4%",
    updated: "Today",
    insight: "Healthy volume, but qualification fields add review work.",
  },
  {
    name: "Onboarding Survey",
    owner: "HR",
    status: "Published",
    responses: 64,
    views: 310,
    completion: 74,
    review: 7,
    trend: "-2%",
    updated: "May 21",
    insight: "Moderate completion; mobile starts are dropping late.",
  },
  {
    name: "Support Request",
    owner: "Support",
    status: "Draft",
    responses: 36,
    views: 210,
    completion: 68,
    review: 24,
    trend: "+9%",
    updated: "Yesterday",
    insight: "Large triage queue; add routing before wider release.",
  },
  {
    name: "Partner Application",
    owner: "Sales",
    status: "Archived",
    responses: 18,
    views: 146,
    completion: 65,
    review: 5,
    trend: "-6%",
    updated: "Apr 30",
    insight: "Longest form; archive or rebuild before reuse.",
  },
];

const volumeChartConfig = {
  views: { label: "Views", color: "#737373" },
  starts: { label: "Starts", color: "#fbbf24" },
  responses: { label: "Responses", color: "#60a5fa" },
};

const conversionChartConfig = {
  rate: { label: "Completion", color: "#4ade80" },
  target: { label: "Target", color: "#737373" },
};

const channelChartConfig = {
  "Direct link": { label: "Direct link", color: "#60a5fa" },
  Email: { label: "Email", color: "#4ade80" },
  Embed: { label: "Embed", color: "#fbbf24" },
  "QR code": { label: "QR code", color: "#fb7185" },
};

const backlogChartConfig = {
  count: { label: "Responses", color: "#60a5fa" },
};

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

function CardShell({ title, subtitle, children, className = "" }) {
  return (
    <section className={`rounded-md border border-[#2a2a2a] bg-[#1a1a1a] ${className}`}>
      <div className="border-b border-[#2a2a2a] px-4 py-3.5">
        <h2 className="text-sm font-medium text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-[#737373]">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ResponseVolumeChart() {
  return (
    <CardShell
      title="Engagement trend"
      subtitle="Views, starts, and submitted responses over the last 7 days"
      className="lg:col-span-3  h-full"
    >
      <ChartContainer config={volumeChartConfig} className="h-84 w-full">
        <AreaChart data={responseVolumeData} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="overviewResponses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area type="monotone" dataKey="views" stroke="#737373" strokeWidth={1.5} fill="transparent" dot={false} />
          <Area type="monotone" dataKey="starts" stroke="#fbbf24" strokeWidth={1.5} fill="transparent" dot={false} />
          <Area
            type="monotone"
            dataKey="responses"
            stroke="#60a5fa"
            strokeWidth={2}
            fill="url(#overviewResponses)"
            dot={false}
            activeDot={{ r: 4, fill: "#60a5fa", strokeWidth: 0 }}
          />
        </AreaChart>
      </ChartContainer>
    </CardShell>
  );
}

function ChannelMixChart() {
  const total = channelData.reduce((sum, item) => sum + item.value, 0);

  return (
    <CardShell title="Acquisition mix" subtitle="Submitted responses by source">
      <ChartContainer config={channelChartConfig} className="h-52 w-full">
        <PieChart>
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value, name) => [`${value.toLocaleString()} responses`, name]} />}
          />
          <Pie data={channelData} cx="50%" cy="50%" innerRadius={48} outerRadius={78} dataKey="value" strokeWidth={0}>
            {channelData.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="grid grid-cols-2 gap-2">
        {channelData.map((entry) => (
          <div key={entry.name} className="rounded-md bg-[#202020] px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="truncate text-xs text-[#a3a3a3]">{entry.name}</span>
            </div>
            <p className="mt-1 text-sm font-medium tabular-nums text-white">
              {Math.round((entry.value / total) * 100)}%
            </p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function ConversionHealthChart() {
  return (
    <CardShell title="Conversion health" subtitle="Completion rate against workspace target">
      <ChartContainer config={conversionChartConfig} className="h-64 w-full">
        <ComposedChart data={conversionByFormData} layout="vertical" margin={{ top: 0, right: 12, left: 14, bottom: 0 }}>
          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#737373", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${value}%`}
          />
          <YAxis
            type="category"
            dataKey="form"
            tick={{ fill: "#a3a3a3", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={116}
          />
          <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [`${value}%`, name]} />} />
          <Bar dataKey="rate" fill="#4ade80" radius={[0, 3, 3, 0]} maxBarSize={14} />
          <Line dataKey="target" stroke="#737373" strokeWidth={2} dot={false} type="monotone" />
        </ComposedChart>
      </ChartContainer>
    </CardShell>
  );
}

function ReviewBacklogChart() {
  return (
    <CardShell title="Review queue" subtitle="Operational status of recent responses">
      <ChartContainer config={backlogChartConfig} className="h-64 w-full">
        <BarChart data={backlogData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#2a2a2a" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="queue" tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "#737373", fontSize: 11 }} axisLine={false} tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={42}>
            {backlogData.map((entry) => (
              <Cell key={entry.queue} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </CardShell>
  );
}

function getCompletionColor(pct) {
  if (pct >= 85) return "#4ade80";
  if (pct >= 75) return "#60a5fa";
  if (pct >= 65) return "#fbbf24";
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

function TopFormsTable() {
  return (
    <section className="rounded-md border border-[#2a2a2a] bg-[#1a1a1a]">
      <div className="flex flex-col gap-1 border-b border-[#2a2a2a] px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-white">Top form performance</h2>
          <p className="mt-1 text-xs text-[#737373]">Volume, conversion, backlog, and next useful signal by form</p>
        </div>
        <p className="text-xs text-[#525252]">Last updated May 24</p>
      </div>
      <div className="overflow-hidden">
        <Table className="min-w-[840px]">
          <TableHeader className="bg-[#191919]">
            <TableRow className="border-[#242424] hover:bg-transparent">
              <TableHead className="px-4 text-[#737373]">Form</TableHead>
              <TableHead className="px-4 text-[#737373]">Owner</TableHead>
              <TableHead className="px-4 text-right text-[#737373]">Traffic</TableHead>
              <TableHead className="px-4 text-[#737373]">Completion</TableHead>
              <TableHead className="px-4 text-right text-[#737373]">Review</TableHead>
              <TableHead className="px-4 text-[#737373]">Trend</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#202020]">
            {topFormsData.map((form) => {
              const completionColor = getCompletionColor(form.completion);
              const isPositive = form.trend.startsWith("+");

              return (
                <TableRow key={form.name} className="border-[#202020] hover:bg-[#202020]">
                  <TableCell className="w-[38%] px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-[#f5f5f5]">{form.name}</p>
                      </div>
                      <p className="mt-1 max-w-md text-xs leading-5 text-[#8a8a8a]">{form.insight}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <div className="flex flex-col items-start gap-1.5">
                      <span className="text-xs text-[#a3a3a3]">{form.owner}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusClass(form.status)}`}>
                        {form.status}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <p className="text-sm font-medium tabular-nums text-[#e7e7e7]">{form.responses.toLocaleString()}</p>
                    <p className="mt-1 text-[10px] tabular-nums text-[#737373]">{form.views.toLocaleString()} views</p>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <div className="flex min-w-32 items-center gap-2">
                      <div className="h-1.5 w-24 rounded-full bg-[#2a2a2a]">
                        <div className="h-1.5 rounded-full" style={{ width: `${form.completion}%`, backgroundColor: completionColor }} />
                      </div>
                      <span className="w-9 text-right text-xs font-medium tabular-nums text-[#e7e7e7]">{form.completion}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <span className={`tabular-nums text-sm font-medium ${form.review > 20 ? "text-[#fb923c]" : "text-[#a3a3a3]"}`}>
                      {form.review}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className={`text-xs font-medium ${isPositive ? "text-[#4ade80]" : "text-[#f87171]"}`}>{form.trend}</span>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-[#525252]">
                      <Clock3 className="h-3 w-3" />
                      {form.updated}
                    </p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

export function OverviewScreen() {
  return (
    <FormsScreenShell
      title="Overview">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={FileText} label="Published forms" value="4" detail="2 drafts need final checks" tone="info" />
        <MetricCard icon={Users} label="Responses" value="588" detail="+129 submitted today" tone="good" />
        <MetricCard icon={MousePointerClick} label="Completion" value="78%" detail="3 forms above target" tone="good" />
        <MetricCard icon={AlertCircle} label="Needs review" value="82" detail="31 waiting longest" tone="warn" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-5">
        <ResponseVolumeChart />
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ChannelMixChart />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ConversionHealthChart />
        <ReviewBacklogChart />
      </div>

      <TopFormsTable />
    </FormsScreenShell>
  );
}
