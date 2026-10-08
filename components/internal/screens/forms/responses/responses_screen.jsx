"use client";

import { useMemo } from "react";
import { CreditCard, Gauge, Inbox, ShieldCheck, Timer } from "lucide-react";
import { ScreenHeader, StatGrid } from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { useResponses } from "@/lib/hooks/use-responses";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { ResponseWorkspace } from "./response_workspace";

const COPY = {
  all: { title: "Responses", description: "Triage incoming submissions across every form — review, assign, approve and export." },
  bulk: { title: "Bulk Actions", description: "Select many responses at once to update status, priority, tags and owners, export or print them." },
  export: { title: "Export & Sync", description: "Download question-labelled CSV or JSON, print PDFs, or sync responses through the API." },
  table: { title: "Data Tables & Views", description: "Slice responses with filters, save views, and switch between table and kanban layouts." },
};

// Inbox KPIs over all loaded rows.
export function responseStats(responses) {
  const total = responses.length;
  const needsReview = responses.filter((r) => r.status === "Needs review").length;
  const pendingApproval = responses.filter((r) => r.approval?.state === "pending").length;
  const awaitingPayment = responses.filter((r) => r.status === "Awaiting payment" || ["pending", "unpaid"].includes(r.payment?.status)).length;
  const scored = responses.filter((r) => Number.isFinite(Number(r.score)) && r.score != null);
  const avg = scored.length ? Math.round((scored.reduce((s, r) => s + Number(r.score), 0) / scored.length) * 10) / 10 : null;
  return [
    { label: "Total", value: total.toLocaleString(), hint: "All live submissions", icon: Inbox },
    { label: "Needs review", value: String(needsReview), hint: total ? `${Math.round((needsReview / total) * 100)}% of inbox` : "Nothing waiting", icon: Timer },
    { label: "Pending approval", value: String(pendingApproval), hint: "In an approval chain", icon: ShieldCheck },
    { label: "Awaiting payment", value: String(awaitingPayment), hint: "Checkout not completed", icon: CreditCard },
    { label: "Avg score", value: avg == null ? "—" : String(avg), hint: `${scored.length} scored responses`, icon: Gauge },
  ];
}

// Project-wide inbox; reused by the catalog for "Data Tables & Views", "Bulk Actions" and "Export & Sync".
export function ResponsesScreen({ initialLayout = "table", initialFilters, focus = "all" } = {}) {
  const store = useResponses();
  const { forms } = useForms();
  const { projectId } = useWorkspaceUrl();
  const formsById = useMemo(() => Object.fromEntries(forms.map((f) => [f.id, f])), [forms]);
  const stats = useMemo(() => responseStats(store.responses), [store.responses]);
  const copy = COPY[focus === "all" && initialLayout === "kanban" ? "table" : focus] || COPY.all;

  return (
    <MainScreenWrapper>
      <ScreenHeader title={copy.title} description={copy.description} />
      <StatGrid stats={stats} columns={5} />
      <ResponseWorkspace
        store={store}
        formsById={formsById}
        projectId={projectId}
        initialLayout={initialLayout}
        initialFilters={initialFilters}
        focus={focus}
      />
    </MainScreenWrapper>
  );
}

export default ResponsesScreen;
