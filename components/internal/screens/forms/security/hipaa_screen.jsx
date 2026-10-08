"use client";

import { useMemo, useState } from "react";
import { FileLock2, FileText } from "lucide-react";
import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import {
  DataTable,
  EmptyState,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { ErrorState } from "../screen-shell";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { ChecklistItem, OnOff, COMPLIANCE_SECTION } from "./security_shared";

function sensitiveCount(form) {
  return (form.fieldDefs || []).filter((f) => f.sensitive).length;
}

function hasRetention(form) {
  return parseInt(form.settings?.retentionDays, 10) > 0;
}

// HIPAA & certifications: which forms carry ePHI and whether the safeguards around them are in place.
export function HipaaScreen() {
  const { forms, loading, error, refresh } = useForms();
  const { openForm, setView } = useWorkspaceUrl();
  const [search, setSearch] = useState("");

  const phiForms = useMemo(() => forms.filter((f) => sensitiveCount(f) > 0), [forms]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? phiForms.filter((f) => (f.name || "").toLowerCase().includes(q)) : phiForms;
  }, [phiForms, search]);
  const pager = usePagination(filtered, { resetKey: search });
  const stats = useMemo(
    () => [
      { label: "Forms with ePHI", value: String(phiForms.length), footer: "Have fields marked sensitive" },
      { label: "Sensitive fields", value: String(phiForms.reduce((s, f) => s + sensitiveCount(f), 0)), footer: "Encrypted at rest, masked in UI" },
      { label: "With retention", value: `${phiForms.filter(hasRetention).length}/${phiForms.length}`, footer: "ePHI forms auto-deleting" },
      { label: "Login required", value: `${phiForms.filter((f) => f.settings?.access?.mode === "login").length}/${phiForms.length}`, footer: "ePHI forms behind suite login" },
    ],
    [phiForms],
  );

  const columns = [
    { key: "name", header: "Form", render: (f) => <span className="block max-w-60 truncate font-medium text-foreground">{f.name}</span> },
    { key: "fields", header: "Sensitive fields", align: "right", render: (f) => <span className="tabular-nums">{sensitiveCount(f)}</span> },
    { key: "access", header: "Access", render: (f) => <Badge variant={f.settings?.access?.mode === "public" ? "warning" : "success"}>{f.settings?.access?.mode || "public"}</Badge> },
    { key: "retention", header: "Retention", render: (f) => <OnOff on={hasRetention(f)} label={hasRetention(f) ? `${f.settings.retentionDays} days` : "Forever"} /> },
    {
      key: "notify",
      header: "Email alerts",
      render: (f) => ((f.settings?.notifyEmails || []).length ? <Badge variant="warning">Sends answers</Badge> : <OnOff on label="None" />),
    },
    {
      key: "configure",
      header: "",
      align: "right",
      render: (f) => (
        <Button variant="outline" size="sm" onClick={() => openForm(f.id, COMPLIANCE_SECTION)}>
          Configure
        </Button>
      ),
    },
  ];

  const header = (
    <ScreenHeader
      title="HIPAA & Certifications"
      description="Safeguards for protected health information: field encryption, access logging, retention, and least-privilege roles."
      actions={
        <Button variant="outline" onClick={() => setView("collab.activity")}>
          Access log
        </Button>
      }
    />
  );

  if (loading) {
    return (
      <MainScreenWrapper>
        {header}
        <LoadingArea panel size={40} label="Loading compliance overview" />
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

  return (
    <MainScreenWrapper>
      {header}
      <StatsBar stats={stats} />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search forms…" />
      </Toolbar>
      <div className="space-y-5">
        <DataTable
          columns={columns}
          data={pager.pageItems}
          getRowKey={(f) => f.id}
          empty={
            <div className="rounded-xl border border-border bg-surface-subtle">
              {phiForms.length ? (
                <EmptyState
                  icon={FileLock2}
                  title="No forms match your search"
                  description="Try a different form name."
                  action={
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={forms.length ? FileLock2 : FileText}
                  title="No sensitive fields yet"
                  description="Mark a field as Sensitive in the builder's field settings to encrypt it at rest and mask it in the inbox."
                />
              )}
            </div>
          }
        />
        <ListPagination {...pager} itemLabel="forms" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Safeguards checklist">
          <ul className="space-y-4">
            <ChecklistItem done={false} title="Field-level encryption (verify server key)">
              Sensitive answers are encrypted server-side before storage. Requires FORMS_ENCRYPTION_KEY (base64, 32 bytes) on the server; the browser can&apos;t verify it, so confirm it in your deployment&apos;s environment.
            </ChecklistItem>
            <ChecklistItem done title="Masking & reveal logging">
              Sensitive values show masked in the inbox; revealing, exporting, or printing a response is written to the access log with who and when.
            </ChecklistItem>
            <ChecklistItem done={phiForms.length > 0 && phiForms.every(hasRetention)} title="Retention limits">
              Set a retention window on every ePHI form so data isn&apos;t kept longer than needed.
            </ChecklistItem>
            <ChecklistItem done title="Least-privilege access">
              Use Roles &amp; Permissions to limit who can view, export, or delete responses.
            </ChecklistItem>
            <ChecklistItem done={phiForms.every((f) => !(f.settings?.notifyEmails || []).length)} title="Keep PHI out of email">
              Notification emails include answers; turn them off on ePHI forms or rely on in-app review instead.
            </ChecklistItem>
          </ul>
        </SectionCard>
        <SectionCard title="Certifications & BAA">
          <div className="space-y-3 text-sm text-text-secondary">
            <p>
              HIPAA compliance is shared between the app and its hosting. Geiger Forms provides the technical safeguards above; it is not itself a certified product.
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Sign a Business Associate Agreement with Supabase (HIPAA add-on) for the database and storage.</li>
              <li>Use an email provider that will sign a BAA, or keep PHI out of emails entirely.</li>
              <li>SOC 2 and ISO 27001 reports come from your hosting and Supabase plans, not from this app.</li>
            </ul>
          </div>
        </SectionCard>
      </div>
    </MainScreenWrapper>
  );
}

export default HipaaScreen;
