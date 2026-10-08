"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Eraser, FileText, Globe2, Loader2 } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
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
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { callApi } from "@/lib/forms/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function retentionOf(form) {
  const n = parseInt(form.settings?.retentionDays, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function hasSensitive(form) {
  return (form.fieldDefs || []).some((f) => f.sensitive);
}

// Inline retention editor; saves on blur or Enter.
function RetentionCell({ form, canEdit, onSave }) {
  const current = retentionOf(form);
  const [value, setValue] = useState(current ? String(current) : "");
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const trimmed = value.trim();
    if (trimmed === (current ? String(current) : "")) return;
    if (trimmed && (!/^\d+$/.test(trimmed) || Number(trimmed) < 1)) {
      toast.error("Retention must be a whole number of days.");
      setValue(current ? String(current) : "");
      return;
    }
    setSaving(true);
    const ok = await onSave(form, trimmed);
    setSaving(false);
    if (!ok) setValue(current ? String(current) : "");
  };

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Input
        value={value}
        disabled={!canEdit || saving}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        placeholder="Keep forever"
        inputMode="numeric"
        aria-label={`Retention days for ${form.name}`}
        className="h-8 w-32 border-border bg-surface-card text-xs text-foreground"
      />
      <span className="text-xs text-text-tertiary">days</span>
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-text-tertiary" /> : null}
    </div>
  );
}

function EraseCard() {
  const canDelete = useCan("forms.response.delete");
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid = EMAIL_RE.test(email.trim());

  const erase = async () => {
    setBusy(true);
    const { ok, data } = await callApi("/api/workspace/erase", { method: "POST", body: { email: email.trim() } });
    setBusy(false);
    setConfirming(false);
    if (!ok) {
      toast.error(data?.error || "Couldn't erase that respondent's data.");
      return;
    }
    const count = Number(data?.count || 0);
    const partials = Number(data?.partials || 0);
    toast.success(
      count || partials
        ? `Erased ${count} response${count === 1 ? "" : "s"} and ${partials} partial${partials === 1 ? "" : "s"} for ${email.trim()}`
        : `No data found for ${email.trim()}`,
    );
    setEmail("");
  };

  return (
    <SectionCard
      title="Right to erasure"
      description="Permanently delete every response, partial, and uploaded file submitted with an email address (GDPR Art. 17 / CCPA deletion requests)."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Respondent email" className="flex-1">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="person@example.com"
            className="border-border bg-surface-card text-foreground"
          />
        </Field>
        <Button
          variant="outline"
          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
          disabled={!valid || !canDelete}
          onClick={() => setConfirming(true)}
        >
          <Eraser className="h-4 w-4" /> Erase data
        </Button>
      </div>
      {!canDelete ? <p className="mt-2 text-xs text-text-tertiary">Your role can&apos;t delete responses.</p> : null}

      <Dialog open={confirming} onOpenChange={(o) => !busy && setConfirming(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Erase all data for {email.trim()}?</DialogTitle>
            <DialogDescription>
              Every response, saved partial, and uploaded file from this address is permanently removed across all forms. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={busy} onClick={erase}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Erase permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// Retention & GDPR: per-form retention, erasure requests, anonymous mode, and residency.
export function RetentionScreen({ focus = "retention" }) {
  const { forms, loading, error, refresh, mergeSettings } = useForms();
  const { openForm } = useWorkspaceUrl();
  const canEdit = useCan("forms.form.edit");
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const withRetention = forms.filter((f) => retentionOf(f));
    const shortest = withRetention.length ? Math.min(...withRetention.map(retentionOf)) : null;
    return [
      { label: "Retention set", value: `${withRetention.length}/${forms.length}`, footer: "Forms with auto-deletion" },
      { label: "Shortest window", value: shortest ? `${shortest}d` : "—", footer: "Days responses are kept" },
      { label: "Anonymous forms", value: String(forms.filter((f) => f.settings?.anonymous).length), footer: "No IP, email, or user id stored" },
      { label: "Sensitive-field forms", value: String(forms.filter(hasSensitive).length), footer: "Encrypted at rest & masked" },
    ];
  }, [forms]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? forms.filter((f) => (f.name || "").toLowerCase().includes(q)) : forms;
  }, [forms, search]);
  const pager = usePagination(filtered, { resetKey: search });

  const saveRetention = async (form, days) => {
    try {
      await mergeSettings(form.id, { retentionDays: days });
      toast.success(days ? `${form.name}: responses kept ${days} days` : `${form.name}: responses kept indefinitely`);
      return true;
    } catch (err) {
      console.error("[retention.save]", err);
      toast.error("Couldn't update retention.");
      return false;
    }
  };

  const columns = [
    { key: "name", header: "Form", render: (f) => <span className="block max-w-64 truncate font-medium text-foreground">{f.name}</span> },
    { key: "retention", header: "Retention", render: (f) => <RetentionCell form={f} canEdit={canEdit} onSave={saveRetention} /> },
    {
      key: "privacy",
      header: "Privacy",
      render: (f) => (
        <div className="flex flex-wrap gap-1">
          {f.settings?.anonymous ? <Badge variant="info">Anonymous</Badge> : null}
          {hasSensitive(f) ? <Badge variant="purple">Sensitive fields</Badge> : null}
          {f.settings?.policy?.enabled ? <Badge variant="neutral">Policy ack</Badge> : null}
          {!f.settings?.anonymous && !hasSensitive(f) && !f.settings?.policy?.enabled ? <span className="text-xs text-text-tertiary">Standard</span> : null}
        </div>
      ),
    },
    { key: "responses", header: "Responses", align: "right", render: (f) => <span className="tabular-nums">{(f.responses || 0).toLocaleString()}</span> },
    {
      key: "configure",
      header: "",
      align: "right",
      render: (f) => (
        <Button variant="outline" size="sm" onClick={() => openForm(f.id, "access")}>
          Configure
        </Button>
      ),
    },
  ];

  const gdpr = focus === "gdpr";
  const header = (
    <ScreenHeader
      title={gdpr ? "Data Protection & GDPR" : "Retention & GDPR"}
      description="Control how long responses are kept, honor erasure requests, and collect anonymously where you can."
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading data-protection settings" />
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

  const table = (
    <SectionCard
      title="Retention by form"
      description="Responses and partials older than the window are deleted by the daily retention job (/api/cron/retention, scheduled in vercel.json with CRON_SECRET). Leave blank to keep them."
      bodyPadding={false}
    >
      <div className="flex items-center justify-end border-b border-border px-5 py-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
      </div>
      <DataTable
        className="rounded-none border-0"
        columns={columns}
        data={pager.pageItems}
        getRowKey={(f) => f.id}
        empty={
          forms.length ? (
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
          ) : (
            <EmptyState icon={FileText} title="No forms yet" description="Retention applies per form once you create one." />
          )
        }
      />
      <ListPagination {...pager} itemLabel="forms" className="border-t border-border px-5 py-3" />
    </SectionCard>
  );

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      {gdpr ? (
        <>
          <EraseCard />
          {table}
        </>
      ) : (
        <>
          {table}
          <EraseCard />
        </>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Anonymous mode">
          <p className="text-sm text-text-secondary">
            Anonymous forms skip respondent email, signed-in user id, and IP hash, so responses can&apos;t be traced back to a person. Turn it on per form under Access &amp; Sharing; it also disables one-response-per-user and duplicate detection by email.
          </p>
        </SectionCard>
        <SectionCard title="Data residency">
          <div className="flex gap-3">
            <Globe2 className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary" />
            <p className="text-sm text-text-secondary">
              Responses, partials, and uploads live in the suite&apos;s Supabase project, in the region it was created in (Project settings → General). Uploads use the private <code className="rounded bg-surface-card px-1 text-xs">forms-uploads</code> bucket with short-lived signed links. Moving regions means migrating the Supabase project.
            </p>
          </div>
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default RetentionScreen;
