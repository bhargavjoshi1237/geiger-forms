import { BarChart3, Gauge, TrendingUp, Users } from "lucide-react";
import { DataPanel, FormsScreenShell } from "../screen-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const funnel = [
  { label: "Viewed", value: "2,840", pct: "100%", bar: "100%", neutral: false },
  { label: "Started", value: "1,920", pct: "67.6%", bar: "67.6%", neutral: false },
  { label: "Completed", value: "1,498", pct: "52.7%", bar: "52.7%", neutral: false },
  { label: "Dropped off", value: "422", pct: "14.9%", bar: "14.9%", neutral: true },
];

const breakdown = [
  { name: "Customer Intake", views: 980, completions: 128, rate: 13.1 },
  { name: "Event Registration", views: 1200, completions: 342, rate: 28.5 },
  { name: "Product Feedback", views: 660, completions: 64, rate: 9.7 },
];

const topForms = [
  { name: "Event Registration", responses: 342, change: "+18%" },
  { name: "Customer Intake", responses: 128, change: "+4%" },
  { name: "Onboarding Survey", responses: 64, change: "-2%" },
];

const fieldDropoff = [
  { label: "Name", reached: 1920, answered: 1905, abandoned: 15, dropPct: 0.8 },
  { label: "Email", reached: 1905, answered: 1880, abandoned: 25, dropPct: 1.3 },
  { label: "Position", reached: 1880, answered: 1810, abandoned: 70, dropPct: 3.7 },
  { label: "CV Upload", reached: 1810, answered: 1620, abandoned: 190, dropPct: 10.5 },
  { label: "Cover Letter", reached: 1620, answered: 1498, abandoned: 122, dropPct: 7.5 },
];

function DropoffBar({ pct }) {
  const color = pct >= 8 ? "bg-[#7c2d12]" : pct >= 4 ? "bg-[#451a03]" : "bg-[#2a2a2a]";
  return (
    <div className="h-1.5 w-24 rounded-full bg-[#242424]">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(pct * 5, 100)}%` }} />
    </div>
  );
}

export function AnalyticsScreen() {
  return (
    <FormsScreenShell
      eyebrow="Insights"
      title="Analytics"
      description="Track engagement, conversion, and response health for your form workspace."
      stats={[
        { label: "Views", value: "2.8k", detail: "Last 30 days", Icon: Users },
        { label: "Starts", value: "1.9k", detail: "67.6% of views", Icon: Gauge },
        { label: "Completions", value: "1.5k", detail: "78% of starts", Icon: TrendingUp },
        { label: "Drop-off", value: "22%", detail: "Across all forms", Icon: BarChart3 },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-5">
        <DataPanel
          title="Conversion funnel"
          description="Last 30 days across all published forms"
          className="md:col-span-3"
        >
          <div className="space-y-5">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className={`font-medium ${step.neutral ? "text-[#525252]" : "text-[#d4d4d4]"}`}>{step.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#525252]">{step.pct}</span>
                    <span className={`tabular-nums font-medium ${step.neutral ? "text-[#525252]" : "text-[#e7e7e7]"}`}>{step.value}</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-[#242424]">
                  <div className={`h-2 rounded-full transition-all ${step.neutral ? "bg-[#3a2020]" : "bg-[#e7e7e7]"}`} style={{ width: step.bar }} />
                </div>
              </div>
            ))}
          </div>
        </DataPanel>

        <div className="flex flex-col gap-4 md:col-span-2">
          <DataPanel title="By form" description="Completion rates">
            <div className="space-y-4">
              {breakdown.map((f) => (
                <div key={f.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="truncate pr-2 text-xs text-[#a3a3a3]">{f.name}</span>
                    <span className="shrink-0 tabular-nums text-xs font-medium text-[#e7e7e7]">{f.rate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#242424]">
                    <div className="h-1.5 rounded-full bg-[#474747]" style={{ width: `${Math.min(f.rate * 2.5, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] text-[#525252]">{f.completions} of {f.views} converted</p>
                </div>
              ))}
            </div>
          </DataPanel>

          <DataPanel title="Top forms" description="By total responses">
            <div className="space-y-2">
              {topForms.map((f) => (
                <div key={f.name} className="flex items-center justify-between rounded-md bg-[#202020] px-3 py-2.5">
                  <span className="truncate pr-2 text-xs text-[#d4d4d4]">{f.name}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular-nums text-xs font-medium text-[#e7e7e7]">{f.responses}</span>
                    <span className={`text-[10px] font-medium ${f.change.startsWith("+") ? "text-[#4ade80]" : "text-[#ef4444]"}`}>{f.change}</span>
                  </div>
                </div>
              ))}
            </div>
          </DataPanel>
        </div>
      </div>

      <DataPanel
        title="Field drop-off"
        description="Which questions cause respondents to abandon — sorted by abandonment rate."
      >
        <div className="overflow-hidden">
          <Table className="min-w-[480px] text-xs">
            <TableHeader className="bg-transparent">
              <TableRow className="border-[#242424] hover:bg-transparent">
                <TableHead className="h-auto px-0 pb-2.5 pr-4 text-[#525252]">Field</TableHead>
                <TableHead className="h-auto px-0 pb-2.5 pr-4 text-right text-[#525252]">Reached</TableHead>
                <TableHead className="h-auto px-0 pb-2.5 pr-4 text-right text-[#525252]">Answered</TableHead>
                <TableHead className="h-auto px-0 pb-2.5 pr-4 text-right text-[#525252]">Abandoned</TableHead>
                <TableHead className="h-auto px-0 pb-2.5 text-[#525252]">Drop-off</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#1e1e1e]">
              {fieldDropoff.map((row) => (
                <TableRow key={row.label} className="border-[#1e1e1e] text-[#d4d4d4]">
                  <TableCell className="px-0 py-3 pr-4 font-medium text-[#e7e7e7]">{row.label}</TableCell>
                  <TableCell className="px-0 py-3 pr-4 text-right tabular-nums text-[#737373]">{row.reached.toLocaleString()}</TableCell>
                  <TableCell className="px-0 py-3 pr-4 text-right tabular-nums">{row.answered.toLocaleString()}</TableCell>
                  <TableCell className="px-0 py-3 pr-4 text-right tabular-nums">
                    <span className={row.abandoned > 100 ? "text-[#fb923c]" : row.abandoned > 50 ? "text-[#fbbf24]" : "text-[#737373]"}>
                      {row.abandoned}
                    </span>
                  </TableCell>
                  <TableCell className="px-0 py-3">
                    <div className="flex items-center gap-2">
                      <DropoffBar pct={row.dropPct} />
                      <span className={`tabular-nums text-[10px] font-medium ${row.dropPct >= 8 ? "text-[#fb923c]" : row.dropPct >= 4 ? "text-[#fbbf24]" : "text-[#525252]"}`}>
                        {row.dropPct}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-[10px] text-[#525252]">
          Abandonment is measured as respondents who reached a field but did not complete the form. High drop-off on file upload fields is common.
        </p>
      </DataPanel>
    </FormsScreenShell>
  );
}
