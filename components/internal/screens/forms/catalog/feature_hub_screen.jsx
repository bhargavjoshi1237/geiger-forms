"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, SearchX, Wrench } from "lucide-react";
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
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import FilterDropdown from "@/components/internal/shared/filter_dropdown";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { navItemById } from "@/components/internal/sidebar/sidebar_nav";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { withPrefix } from "@/lib/workspace/base-path";
import { OnOff } from "@/components/internal/screens/forms/security/security_shared";
import { STATUS_META, featureFor } from "./feature_map";

const USAGE_OPTIONS = [
  { value: "all", label: "All forms" },
  { value: "on", label: "Using it" },
  { value: "off", label: "Not using it" },
];

const FORM_STATUS_VARIANT = { Published: "success", Draft: "neutral", Archived: "neutral" };

// Generic capability page for a per-form catalog feature: what it does, readiness, and where each form stands.
export function FeatureHubScreen({ view }) {
  const feature = featureFor(view);
  const nav = navItemById(view);
  const router = useRouter();
  const { forms, loading, error, refresh } = useForms();
  const { openForm, setView } = useWorkspaceUrl();
  const [usage, setUsage] = useState("all");
  const [search, setSearch] = useState("");

  const rows = useMemo(
    () => (feature ? forms.map((f) => ({ form: f, state: feature.detect ? feature.detect(f) : { on: false, note: "—" } })) : []),
    [forms, feature],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(({ form, state }) => {
      if (usage === "on" && !state.on) return false;
      if (usage === "off" && state.on) return false;
      return !q || (form.name || "").toLowerCase().includes(q);
    });
  }, [rows, usage, search]);
  const pager = usePagination(filtered, { resetKey: `${view}|${search}|${usage}` });

  if (!feature) return null;

  const status = STATUS_META[feature.status] || STATUS_META.available;
  const configure = (form) => (feature.builder ? router.push(withPrefix(`/forms/${form.slug}`)) : openForm(form.id, feature.sectionKey));
  const actionLabel = feature.builder ? "Open builder" : "Configure";

  const header = (
    <ScreenHeader
      title={feature.title}
      description={`${nav?.group ? `${nav.group} · ` : ""}${feature.description}`}
      actions={<Badge variant={status.variant}>{status.label}</Badge>}
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading forms" />
      </MainScreenWrapper>
    );
  }
  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Forms couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }

  const using = rows.filter((r) => r.state.on).length;
  const published = rows.filter((r) => r.state.on && r.form.status === "Published").length;
  const stats = [
    { label: "Forms using it", value: `${using}/${rows.length}` },
    { label: "Live", value: String(published), footer: "Published forms using it" },
    { label: "Status", value: status.label },
  ];

  const columns = [
    {
      key: "name",
      header: "Form",
      render: ({ form }) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{form.name}</p>
          <p className="text-xs text-text-tertiary">{form.fields} fields · {(form.responses || 0).toLocaleString()} responses</p>
        </div>
      ),
    },
    { key: "status", header: "Status", render: ({ form }) => <Badge variant={FORM_STATUS_VARIANT[form.status] || "neutral"}>{form.status}</Badge> },
    { key: "usage", header: "This feature", render: ({ state }) => <OnOff on={state.on} label={state.note} /> },
    {
      key: "action",
      header: "",
      align: "right",
      render: ({ form }) => (
        <Button variant="outline" size="sm" onClick={() => configure(form)}>
          {actionLabel}
        </Button>
      ),
    },
  ];

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} columns={3} />

      {feature.setup ? (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-400">
            <Wrench className="h-4 w-4" /> Setup required
          </p>
          <p className="mt-1.5 text-xs leading-5 text-text-secondary">{feature.setup}</p>
        </div>
      ) : null}

      <Toolbar>
        <FilterDropdown value={usage} onValueChange={setUsage} options={USAGE_OPTIONS} height="h-9" />
        <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={({ form }) => form.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {rows.length ? (
                <EmptyState
                  icon={SearchX}
                  title="No forms match"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setUsage("all");
                        setSearch("");
                      }}
                    >
                      Clear filters
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No forms yet"
                  description="Create a form to start using this feature."
                  action={
                    <Button variant="outline" size="sm" onClick={() => setView("Forms")}>
                      Go to All Forms
                    </Button>
                  }
                />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="forms" />
      </div>
    </MainScreenWrapper>
  );
}

export default FeatureHubScreen;
