"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis } from "recharts";
import { ArrowLeft, BarChart3, CheckCircle2, Download, FileSignature, Inbox, PencilRuler, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@geiger/ui/chart";
import { Button } from "@geiger/ui/button";
import { ScreenHeader, SectionCard, StatGrid, StatusPill } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { useResponses } from "@/lib/hooks/use-responses";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { useCan } from "@/context/rbac-context";
import { downloadResponses } from "@/lib/forms/export";
import { withPrefix } from "@/lib/workspace/base-path";
import { ResponseWorkspace } from "./response_workspace";
import { AcknowledgementsReport, SurveyReport } from "./survey_report";
import { FORM_STATUS_MAP, OUTLINE_BUTTON, RESPONSE_STATUSES, STATUS_CHART_COLORS } from "./constants";

const VOLUME_COLOR = "var(--color-sky-400)";
const volumeChartConfig = { responses: { label: "Responses", color: VOLUME_COLOR } };
const statusChartConfig = Object.fromEntries(RESPONSE_STATUSES.map((s) => [s, { label: s, color: STATUS_CHART_COLORS[s] }]));

function buildVolume(responses) {
  const days = [];
  const counts = {};
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    days.push({ key, label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) });
    counts[key] = 0;
  }
  for (const r of responses) {
    if (!r.submittedAt) continue;
    const key = new Date(r.submittedAt).toLocaleDateString("en-CA");
    if (key in counts) counts[key] += 1;
  }
  return days.map((d) => ({ day: d.label, responses: counts[d.key] }));
}

// One form's responses: KPIs, volume/status charts, the shared inbox, a survey report and policy acknowledgements.
export function FormResponsesScreen({ form, onBack }) {
  const store = useResponses({ formId: form.id });
  const { responses } = store;
  const { projectId } = useWorkspaceUrl();
  const canExport = useCan("forms.response.export");
  const [tab, setTab] = useState("responses");
  const policyEnabled = Boolean(form.settings?.policy?.enabled);

  const volumeData = useMemo(() => buildVolume(responses), [responses]);
  const statusCounts = useMemo(
    () =>
      RESPONSE_STATUSES.map((name) => ({ name, value: responses.filter((r) => r.status === name).length, fill: STATUS_CHART_COLORS[name] })).filter(
        (s) => s.value > 0 || ["Complete", "Needs review", "Pending"].includes(s.name),
      ),
    [responses],
  );
  const stats = useMemo(() => {
    const total = responses.length;
    const done = responses.filter((r) => r.status === "Complete" || r.status === "Approved").length;
    const high = responses.filter((r) => r.priority === "High").length;
    const scored = responses.filter((r) => r.score != null && Number.isFinite(Number(r.score)));
    const avg = scored.length ? Math.round((scored.reduce((s, r) => s + Number(r.score), 0) / scored.length) * 10) / 10 : null;
    return [
      { label: "Total responses", value: String(total), hint: `${responses.filter((r) => r.status === "Needs review").length} need review`, icon: Inbox },
      { label: "Resolved", value: `${total ? Math.round((done / total) * 100) : 0}%`, hint: `${done} complete or approved`, icon: CheckCircle2 },
      { label: "Avg score", value: avg == null ? "—" : String(avg), hint: `${scored.length} scored`, icon: Star },
      { label: "High priority", value: String(high), hint: `${total ? Math.round((high / total) * 100) : 0}% of responses`, icon: Zap },
    ];
  }, [responses]);

  const exportAll = () => {
    if (!responses.length) return toast.error("Nothing to export yet.");
    downloadResponses(responses, "csv", `${form.slug || form.name}-responses`, { form });
    toast.success(`Exported ${responses.length} responses as CSV`);
  };

  const tabs = [
    { label: "Responses", value: "responses", icon: Inbox },
    { label: "Survey report", value: "report", icon: BarChart3 },
    ...(policyEnabled ? [{ label: "Acknowledgements", value: "acks", icon: FileSignature }] : []),
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title={form.name}
        description={`${responses.length} response${responses.length === 1 ? "" : "s"} · ${form.status}`}
        actions={
          <>
            {onBack ? (
              <Button variant="outline" className={OUTLINE_BUTTON} onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            ) : null}
            <StatusPill status={form.status} map={FORM_STATUS_MAP} />
            {canExport ? (
              <Button variant="outline" className={OUTLINE_BUTTON} onClick={exportAll} disabled={!responses.length}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            ) : null}
            {form.slug ? (
              <Button variant="outline" className={OUTLINE_BUTTON} asChild>
                <Link href={withPrefix(`/forms/${form.slug}`)}>
                  <PencilRuler className="h-4 w-4" /> Open builder
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <StatGrid stats={stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Response volume" description="Last 7 days" className="lg:col-span-2">
          <ChartContainer config={volumeChartConfig} className="h-[180px] w-full">
            <AreaChart data={volumeData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="formResponseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={VOLUME_COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={VOLUME_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="responses" stroke={VOLUME_COLOR} strokeWidth={2} fill="url(#formResponseGradient)" dot={false} activeDot={{ r: 4, fill: VOLUME_COLOR, strokeWidth: 0 }} />
            </AreaChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Status breakdown" description="All responses">
          <ChartContainer config={statusChartConfig} className="h-[160px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [value, name]} />} />
              <Pie data={statusCounts} cx="50%" cy="50%" innerRadius={45} outerRadius={68} dataKey="value" strokeWidth={0}>
                {statusCounts.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
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
        </SectionCard>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.icon ? <t.icon /> : null}
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* The inbox stays mounted so its filters/selection survive tab switches. */}
      <div className={tab === "responses" ? undefined : "hidden"}>
        <ResponseWorkspace store={store} form={form} projectId={form.projectId ?? projectId} />
      </div>
      {tab === "report" ? <SurveyReport form={form} responses={responses} /> : null}
      {tab === "acks" && policyEnabled ? <AcknowledgementsReport form={form} responses={responses} /> : null}
    </MainScreenWrapper>
  );
}

export default FormResponsesScreen;
