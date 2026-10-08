"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Eye, SearchX } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { listAccess, listActivity } from "@/lib/supabase/audit";
import { FormPicker } from "@/components/internal/screens/forms/analytics/analytics_ui";

// Known audit actions; anything else is humanized from its dotted key.
const ACTION_LABELS = {
  "form.created": "Created form",
  "form.updated": "Edited form",
  "form.published": "Published form",
  "form.unpublished": "Unpublished form",
  "form.archived": "Archived form",
  "form.deleted": "Deleted form",
  "form.duplicated": "Duplicated form",
  "form.restored": "Restored version",
  "form.shared": "Shared form",
  "response.created": "New response",
  "response.updated": "Updated response",
  "response.approved": "Approved response",
  "response.rejected": "Rejected response",
  "response.escalated": "Escalated to Flow",
  "response.countersigned": "Countersigned response",
  "responses.bulk_updated": "Bulk-updated responses",
  "responses.deleted": "Deleted responses",
  "responses.exported": "Exported responses",
  "respondent.erased": "Erased respondent data",
  "role.changed": "Changed a role",
  "apikey.created": "Created API key",
  "apikey.revoked": "Revoked API key",
  "settings.updated": "Updated settings",
};

const ACCESS_MAP = {
  view: { label: "Viewed", variant: "neutral" },
  reveal: { label: "Revealed sensitive", variant: "warning" },
  export: { label: "Exported", variant: "info" },
  print: { label: "Printed", variant: "info" },
  edit: { label: "Edited", variant: "purple" },
};

export function actionLabel(action) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  const text = String(action || "Activity").replace(/[._]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function actionVariant(action = "") {
  if (/delet|erase|revok|reject/.test(action)) return "danger";
  if (/publish|approv|creat/.test(action)) return "success";
  if (/export|share/.test(action)) return "info";
  return "neutral";
}

function detailText(detail = {}) {
  if (!detail || typeof detail !== "object") return "";
  if (typeof detail.count === "number") return `${detail.count} item${detail.count === 1 ? "" : "s"}`;
  const parts = Object.entries(detail)
    .filter(([k, v]) => k !== "title" && (typeof v === "string" || typeof v === "number" || typeof v === "boolean"))
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${v}`);
  return parts.join(" · ");
}

function stamp(iso) {
  return iso ? new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
}

export function ActivityScreen() {
  const { forms, loading: formsLoading } = useForms();
  const { projectId, setView } = useWorkspaceUrl();
  const [tab, setTab] = useState("activity");
  const [formId, setFormId] = useState("all");
  const [action, setAction] = useState("all");
  const [actor, setActor] = useState("all");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState({ key: null, activity: [], access: [], error: null });
  const [reloads, setReloads] = useState(0);
  const [now] = useState(() => Date.now());
  const loadKey = `${projectId || ""}|${reloads}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [activity, access] = await Promise.all([listActivity({ projectId: projectId || undefined, limit: 500 }), listAccess({ limit: 500 })]);
        return { activity, access, error: null };
      } catch (err) {
        console.error("[activity.load]", err);
        return { activity: [], access: [], error: err };
      }
    })().then((next) => alive && setResult({ key: loadKey, ...next }));
    return () => {
      alive = false;
    };
  }, [projectId, loadKey]);

  const loading = formsLoading || result.key !== loadKey;
  const formById = useMemo(() => new Map(forms.map((f) => [f.id, f])), [forms]);
  // The access log isn't project-scoped server-side, so keep only this workspace's forms.
  const access = useMemo(() => (projectId ? result.access.filter((a) => formById.has(a.formId)) : result.access), [result.access, formById, projectId]);
  const activity = result.activity;

  const actionOptions = useMemo(() => {
    const keys = [...new Set((tab === "activity" ? activity : access).map((r) => r.action))].sort();
    return [{ value: "all", label: "All actions" }, ...keys.map((k) => ({ value: k, label: tab === "activity" ? actionLabel(k) : ACCESS_MAP[k]?.label || k }))];
  }, [tab, activity, access]);
  const actorOptions = useMemo(() => {
    const names = [...new Set((tab === "activity" ? activity : access).map((r) => r.actorName).filter(Boolean))].sort();
    return [{ value: "all", label: "Everyone" }, ...names.map((n) => ({ value: n, label: n }))];
  }, [tab, activity, access]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tab === "activity" ? activity : access).filter((r) => {
      if (formId !== "all" && r.formId !== formId) return false;
      if (action !== "all" && r.action !== action) return false;
      if (actor !== "all" && r.actorName !== actor) return false;
      if (q) {
        const hay = `${r.actorName} ${r.action} ${formById.get(r.formId)?.name || r.formTitle || ""} ${detailText(r.detail)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tab, activity, access, formId, action, actor, search, formById]);

  const pager = usePagination(rows, { resetKey: `${search}|${tab}|${formId}|${action}|${actor}` });

  const stats = useMemo(() => {
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    return [
      { label: "Events logged", value: activity.length.toLocaleString(), footer: "Most recent 500" },
      { label: "People active", value: String(new Set(activity.map((a) => a.actorName)).size) },
      { label: "Last 24 hours", value: String(activity.filter((a) => a.createdAt >= dayAgo).length), footer: "Events logged" },
      { label: "Sensitive reveals", value: String(access.filter((a) => a.action === "reveal").length), footer: "Access-log entries" },
    ];
  }, [activity, access, now]);

  const switchTab = (next) => {
    setTab(next);
    setAction("all");
    setActor("all");
  };

  const formCell = (r) => <span className="block max-w-56 truncate text-text-secondary">{formById.get(r.formId)?.name || r.formTitle || "—"}</span>;

  const activityColumns = [
    { key: "when", header: "When", render: (r) => <span className="whitespace-nowrap text-xs text-text-tertiary" title={r.when}>{stamp(r.createdAt)}</span> },
    { key: "actor", header: "Who", render: (r) => <span className="font-medium text-foreground">{r.actorName}</span> },
    { key: "action", header: "Action", render: (r) => <Badge variant={actionVariant(r.action)}>{actionLabel(r.action)}</Badge> },
    { key: "form", header: "Form", render: formCell },
    { key: "detail", header: "Detail", render: (r) => <span className="block max-w-72 truncate text-xs text-text-secondary">{detailText(r.detail) || "—"}</span> },
  ];
  const accessColumns = [
    { key: "when", header: "When", render: (r) => <span className="whitespace-nowrap text-xs text-text-tertiary">{stamp(r.createdAt)}</span> },
    { key: "actor", header: "Who", render: (r) => <span className="font-medium text-foreground">{r.actorName}</span> },
    { key: "action", header: "Access", render: (r) => <Badge variant={ACCESS_MAP[r.action]?.variant || "neutral"}>{ACCESS_MAP[r.action]?.label || r.action}</Badge> },
    { key: "form", header: "Form", render: formCell },
    { key: "response", header: "Response", render: (r) => <span className="font-mono text-xs text-text-tertiary">{r.responseId ? r.responseId.slice(0, 8) : "—"}</span> },
    { key: "field", header: "Field", render: (r) => <span className="text-xs text-text-secondary">{r.fieldId || "All fields"}</span> },
  ];

  const header = (
    <ScreenHeader
      title="Activity & Audit"
      description="Who changed what across forms and responses, plus a log of every time response data was viewed, revealed, exported, or printed."
      actions={
        <Button variant="outline" onClick={() => setReloads((n) => n + 1)}>
          Refresh
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading audit trail" />
      </MainScreenWrapper>
    );
  }
  if (result.error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="The audit trail couldn't be loaded." onRetry={() => setReloads((n) => n + 1)} />
      </MainScreenWrapper>
    );
  }

  const hasFilters = formId !== "all" || action !== "all" || actor !== "all" || search;

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Tabs value={tab} onValueChange={switchTab}>
        <TabsList>
          <TabsTrigger value="activity"><Activity />Activity</TabsTrigger>
          <TabsTrigger value="access"><Eye />Response access log</TabsTrigger>
        </TabsList>
      </Tabs>
      <Toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <FormPicker forms={forms} value={formId} onChange={setFormId} allowAll />
          <FilterDropdown value={action} onValueChange={setAction} options={actionOptions} height="h-9" />
          <FilterDropdown value={actor} onValueChange={setActor} options={actorOptions} height="h-9" />
        </div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search activity…" />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={tab === "activity" ? activityColumns : accessColumns}
          data={pager.pageItems}
          getRowKey={(r) => r.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {hasFilters ? (
                <EmptyState
                  icon={SearchX}
                  title="Nothing matches these filters"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormId("all");
                        setAction("all");
                        setActor("all");
                        setSearch("");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={tab === "activity" ? Activity : Eye}
                  title={tab === "activity" ? "No activity yet" : "No access recorded"}
                  description={
                    tab === "activity"
                      ? "Edits, publishes, deletions, and response changes appear here as your team works."
                      : "Viewing, revealing, exporting, or printing responses is logged here."
                  }
                  action={
                    <Button variant="outline" size="sm" onClick={() => setView("Responses")}>
                      Open responses
                    </Button>
                  }
                />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel={tab === "activity" ? "events" : "entries"} />
      </div>
    </MainScreenWrapper>
  );
}

export default ActivityScreen;
