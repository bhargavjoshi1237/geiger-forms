"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, FlaskConical, Loader2, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Switch } from "@geiger/ui/switch";
import { Textarea } from "@geiger/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@geiger/ui/dialog";
import {
  DataTable,
  EmptyState,
  Field,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { useCan } from "@/context/rbac-context";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import {
  formatPct,
  isCountedResponse,
  pct,
  twoProportionTest,
  uniqueEvents,
  useAnalyticsData,
} from "./analytics_data";
import { Meter, RangePicker } from "./analytics_ui";

const NO_VARIANT = "__none";

// Per-variant views / submissions / conversion with significance against the first variant.
function variantRows(form, events, responses) {
  const variants = form.settings?.abTest?.variants || [];
  const rows = new Map(variants.map((v) => [v.id, { id: v.id, name: v.name || v.title || "Variant", views: 0, submits: 0 }]));
  const row = (id) => {
    const k = id && rows.has(id) ? id : id || NO_VARIANT;
    if (!rows.has(k)) rows.set(k, { id: k, name: k === NO_VARIANT ? "Original (no variant)" : `Removed variant (${k})`, views: 0, submits: 0, extra: true });
    return rows.get(k);
  };
  for (const e of uniqueEvents(events)) if (e.formId === form.id && e.type === "view") row(e.variant).views += 1;
  for (const r of responses) if (r.formId === form.id && isCountedResponse(r)) row(r.metadata?.variant).submits += 1;
  const list = [...rows.values()].filter((r) => !r.extra || r.views || r.submits);
  const control = list[0];
  return list.map((r, i) => {
    const conversion = pct(r.submits, r.views);
    const test = i === 0 || !control ? null : twoProportionTest(r.submits, r.views, control.submits, control.views);
    const lift = i === 0 || !control?.views || !control.submits || !r.views ? null : Math.round(((r.submits / r.views) / (control.submits / control.views) - 1) * 1000) / 10;
    return { ...r, conversion, test, lift, isControl: i === 0 };
  });
}

function blankVariant(n) {
  return { id: crypto.randomUUID().slice(0, 8), name: `Variant ${String.fromCharCode(65 + n)}`, title: "", description: "" };
}

function VariantsDialog({ form, open, onOpenChange, onSave }) {
  const initial = form?.settings?.abTest || { enabled: false, variants: [] };
  const [draft, setDraft] = useState(() => ({ enabled: !!initial.enabled, variants: initial.variants?.length ? initial.variants : [blankVariant(0), blankVariant(1)] }));
  const [saving, setSaving] = useState(false);

  const setVariant = (i, key, value) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v, j) => (j === i ? { ...v, [key]: value } : v)) }));

  const submit = async () => {
    if (draft.enabled && draft.variants.length < 2) {
      toast.error("An A/B test needs at least two variants.");
      return;
    }
    if (draft.variants.some((v) => !v.name.trim())) {
      toast.error("Give every variant a name.");
      return;
    }
    setSaving(true);
    const ok = await onSave({ enabled: draft.enabled, variants: draft.variants.map((v) => ({ ...v, name: v.name.trim() })) });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>A/B variants · {form?.name}</DialogTitle>
          <DialogDescription>
            Each visitor is assigned one variant, which overrides the form&apos;s title and description. Leave a field blank to keep the original copy.
          </DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[60vh] gap-4 overflow-y-auto pr-1">
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-card px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Run this test</p>
              <p className="text-xs text-text-secondary">Visitors are split evenly across variants while enabled.</p>
            </div>
            <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))} />
          </div>
          {draft.variants.map((v, i) => (
            <div key={v.id} className="grid gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <Input
                  value={v.name}
                  onChange={(e) => setVariant(i, "name", e.target.value)}
                  className="h-8 border-border bg-surface-card text-sm text-foreground"
                  aria-label="Variant name"
                />
                {i === 0 ? <Badge variant="info">Control</Badge> : null}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-red-400 hover:bg-red-500/10"
                  aria-label="Remove variant"
                  onClick={() => setDraft((d) => ({ ...d, variants: d.variants.filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Field label="Title override">
                <Input value={v.title} onChange={(e) => setVariant(i, "title", e.target.value)} placeholder={form?.title || form?.name} className="border-border bg-surface-card text-foreground" />
              </Field>
              <Field label="Description override">
                <Textarea value={v.description} onChange={(e) => setVariant(i, "description", e.target.value)} placeholder={form?.description || "Original description"} rows={2} className="border-border bg-surface-card text-foreground" />
              </Field>
            </div>
          ))}
          <Button variant="outline" className="justify-self-start" onClick={() => setDraft((d) => ({ ...d, variants: [...d.variants, blankVariant(d.variants.length)] }))}>
            <Plus className="h-4 w-4" /> Add variant
          </Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="bg-primary text-primary-foreground" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save variants
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SignificanceBadge({ row }) {
  if (row.isControl) return <Badge variant="info">Control</Badge>;
  if (!row.test) return <Badge variant="neutral">Not enough data</Badge>;
  if (!row.test.significant) return <Badge variant="neutral">Not significant · p={row.test.p.toFixed(2)}</Badge>;
  return row.test.z > 0 ? (
    <Badge variant="success">Winning · p={row.test.p.toFixed(3)}</Badge>
  ) : (
    <Badge variant="danger">Losing · p={row.test.p.toFixed(3)}</Badge>
  );
}

export function AbTestScreen() {
  const [days, setDays] = useState("30");
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const canEdit = useCan("forms.form.edit");
  const { openForm } = useWorkspaceUrl();
  const { forms, rangedResponses, events, loading, error, refresh, mergeSettings } = useAnalyticsData({ days });

  const tests = useMemo(
    () =>
      forms
        .filter((f) => f.settings?.abTest?.enabled || f.settings?.abTest?.variants?.length)
        .map((f) => ({ form: f, rows: variantRows(f, events, rangedResponses) })),
    [forms, events, rangedResponses],
  );
  const others = useMemo(() => forms.filter((f) => !tests.some((t) => t.form.id === f.id)), [forms, tests]);
  const filteredOthers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? others.filter((f) => (f.name || "").toLowerCase().includes(q)) : others;
  }, [others, search]);
  const pager = usePagination(filteredOthers, { resetKey: search });
  const editingForm = forms.find((f) => f.id === editing) || null;

  const save = async (abTest) => {
    try {
      await mergeSettings(editing, { abTest });
      toast.success(abTest.enabled ? "A/B test saved and running" : "A/B variants saved");
      return true;
    } catch (err) {
      console.error("[abtest.save]", err);
      toast.error("Couldn't save the variants.");
      return false;
    }
  };

  const header = (
    <ScreenHeader
      title="A/B Testing"
      description="Split traffic between copy variants and see which converts better, with a two-proportion significance test."
      actions={<RangePicker value={days} onChange={setDays} />}
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading experiments" />
      </MainScreenWrapper>
    );
  }
  if (error) {
    return (
      <MainScreenWrapper>
        {header}
        <ErrorState description="Experiment data couldn't be loaded." onRetry={refresh} />
      </MainScreenWrapper>
    );
  }

  const running = tests.filter((t) => t.form.settings.abTest.enabled).length;
  const winners = tests.filter((t) => t.rows.some((r) => r.test?.significant && r.test.z > 0)).length;
  const stats = [
    { label: "Running tests", value: String(running) },
    { label: "Configured", value: String(tests.length), footer: "Forms with variants" },
    { label: "Significant winners", value: String(winners), footer: "p < 0.05 vs control" },
    { label: "Variant views", value: tests.reduce((s, t) => s + t.rows.reduce((a, r) => a + r.views, 0), 0).toLocaleString() },
  ];

  const columns = [
    { key: "name", header: "Variant", render: (r) => <span className="font-medium text-foreground">{r.name}</span> },
    { key: "views", header: "Views", align: "right", render: (r) => <span className="tabular-nums">{r.views.toLocaleString()}</span> },
    { key: "submits", header: "Submissions", align: "right", render: (r) => <span className="tabular-nums">{r.submits.toLocaleString()}</span> },
    {
      key: "conversion",
      header: "Conversion",
      render: (r) => (
        <div className="flex min-w-28 items-center gap-2">
          <Meter value={r.conversion ?? 0} className="w-20" />
          <span className="tabular-nums text-xs text-text-secondary">{formatPct(r.conversion)}</span>
        </div>
      ),
    },
    {
      key: "lift",
      header: "Lift",
      align: "right",
      render: (r) =>
        r.lift == null ? (
          <span className="text-text-tertiary">—</span>
        ) : (
          <span className={`tabular-nums ${r.lift >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {r.lift > 0 ? "+" : ""}
            {r.lift}%
          </span>
        ),
    },
    { key: "sig", header: "Significance", render: (r) => <SignificanceBadge row={r} /> },
  ];

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />

      {tests.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-subtle">
          <EmptyState
            icon={FlaskConical}
            title="No experiments yet"
            description="Pick a form below and add two or more variants of its title and description to start a test."
          />
        </div>
      ) : (
        tests.map(({ form, rows }) => (
          <SectionCard
            key={form.id}
            title={form.name}
            description={form.settings.abTest.enabled ? "Running · traffic split evenly across variants" : "Paused · variants saved but not served"}
            bodyPadding={false}
            action={
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openForm(form.id, "overview")}>
                  Open form
                </Button>
                <Button size="sm" disabled={!canEdit} onClick={() => setEditing(form.id)}>
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Variants
                </Button>
              </div>
            }
          >
            <DataTable className="rounded-none border-0" columns={columns} data={rows} getRowKey={(r) => r.id} />
          </SectionCard>
        ))
      )}

      {others.length ? (
        <SectionCard title="Start a test" description="Forms without variants yet." bodyPadding={false}>
          <div className="flex items-center justify-end border-b border-border px-5 py-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
          </div>
          {filteredOthers.length ? (
            <div className="divide-y divide-border">
              {pager.pageItems.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="truncate text-sm text-foreground">{f.name}</span>
                  <Button variant="outline" size="sm" disabled={!canEdit} onClick={() => setEditing(f.id)}>
                    <Plus className="h-3.5 w-3.5" /> Add variants
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No forms match your search"
              description="Try a different form name."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          )}
          <ListPagination {...pager} itemLabel="forms" className="border-t border-border px-5 py-3" />
        </SectionCard>
      ) : null}

      {editingForm ? (
        <VariantsDialog key={editingForm.id} form={editingForm} open onOpenChange={(o) => !o && setEditing(null)} onSave={save} />
      ) : null}
    </MainScreenWrapper>
  );
}

export default AbTestScreen;
