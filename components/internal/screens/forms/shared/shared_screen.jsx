"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Share2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { Switch } from "@geiger/ui/switch";
import { ListPagination, usePagination } from "@/components/internal/shared/pagination";
import { MainScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  DataTable,
  EmptyState,
  Field,
  LoadingArea,
  ScreenHeader,
  SearchInput,
  SectionCard,
  StatsBar,
  Toolbar,
} from "@geiger/ui/screen-kit";
import { useCan } from "@/context/rbac-context";
import { callApi } from "@/lib/forms/api";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { listGrants, listRoles } from "@/lib/supabase/rbac";
import { cn } from "@/lib/utils";
import { SHARE_ROLES } from "../forms/constants";
import { ChipsInput, FIELD_CLS } from "../forms/sections/kit";
import { ErrorState } from "../screen-shell";

const ROLE_LABEL = Object.fromEntries(SHARE_ROLES.map((r) => [r.value, r.label]));

function initials(email) {
  const handle = (email.split("@")[0] || email).replace(/[^a-z0-9]/gi, "");
  return (handle.slice(0, 2) || "?").toUpperCase();
}

function RoleSelect({ value, onChange, className }) {
  return (
    <Select value={value || "viewer"} onValueChange={onChange}>
      <SelectTrigger className={cn("h-8 w-[120px] text-xs", FIELD_CLS, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SHARE_ROLES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ShareDialog({ open, forms, onClose, onShare }) {
  const [formId, setFormId] = useState("");
  const [emails, setEmails] = useState([]);
  const [role, setRole] = useState("viewer");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!formId) return toast.error("Choose a form.");
    if (!emails.length) return toast.error("Add at least one email.");
    setBusy(true);
    const ok = await onShare({ formId, emails, role, notify });
    setBusy(false);
    if (ok) {
      setEmails([]);
      onClose();
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share a form</DialogTitle>
          <DialogDescription>Add teammates to a form&apos;s access list.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Form">
            <Select value={formId || undefined} onValueChange={setFormId}>
              <SelectTrigger className={cn("h-9", FIELD_CLS)}>
                <SelectValue placeholder="Choose a form…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {forms.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="People">
            <ChipsInput value={emails} onChange={setEmails} placeholder="teammate@company.com" />
          </Field>
          <Field label="Role">
            <RoleSelect value={role} onChange={setRole} className="h-9 w-full" />
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            Email them a link to the form
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Workspace roles and member counts (null when the workspace has no project / RBAC).
function useWorkspaceRoles(projectId) {
  const [state, setState] = useState({ projectId: null, roles: null });
  useEffect(() => {
    if (!projectId) return undefined;
    let alive = true;
    Promise.all([listRoles(projectId), listGrants(projectId)]).then(([roles, grants]) => {
      if (!alive) return;
      const counts = {};
      for (const g of grants || []) counts[g.roleId] = (counts[g.roleId] || 0) + 1;
      setState({ projectId, roles: (roles || []).map((r) => ({ ...r, members: counts[r.id] || 0 })) });
    });
    return () => {
      alive = false;
    };
  }, [projectId]);
  return projectId && state.projectId === projectId ? state.roles : null;
}

export function SharedScreen() {
  const { forms, loading, error, refresh, mergeSettings } = useForms();
  const { projectId, openForm } = useWorkspaceUrl();
  const canInvite = useCan("forms.team.invite");
  const roles = useWorkspaceRoles(projectId);

  const [search, setSearch] = useState("");
  const [sharing, setSharing] = useState(false);

  const rows = useMemo(
    () =>
      forms.flatMap((f) =>
        (f.settings?.sharing || []).filter((s) => s?.email).map((s) => ({ key: `${f.id}:${s.email}`, form: f, email: s.email, role: s.role || "viewer" })),
      ),
    [forms],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => `${r.email} ${r.form.name}`.toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const pager = usePagination(filtered, { resetKey: search });

  const stats = useMemo(() => {
    const people = new Set(rows.map((r) => r.email.toLowerCase()));
    return [
      { label: "Shared forms", value: String(new Set(rows.map((r) => r.form.id)).size), footer: `of ${forms.length} forms` },
      { label: "People", value: String(people.size), footer: "On access lists" },
      { label: "Editors & admins", value: String(rows.filter((r) => r.role !== "viewer").length), footer: "Can change forms" },
      { label: "Workspace roles", value: roles ? String(roles.length) : "—", footer: projectId ? "Enforced access" : "No project" },
    ];
  }, [rows, forms.length, roles, projectId]);

  const writeSharing = async (form, next, success) => {
    try {
      await mergeSettings(form.id, { sharing: next });
      if (success) toast.success(success);
      return true;
    } catch (err) {
      console.error("[shared.write]", err);
      toast.error("Couldn't update access.");
      return false;
    }
  };

  const share = async ({ formId, emails, role, notify }) => {
    const form = forms.find((f) => f.id === formId);
    if (!form) return false;
    const current = form.settings?.sharing || [];
    const lower = emails.map((e) => e.toLowerCase());
    const next = [...current.filter((s) => !lower.includes(s.email?.toLowerCase())), ...lower.map((email) => ({ email, role }))];
    const ok = await writeSharing(form, next, `Shared with ${emails.length} ${emails.length === 1 ? "person" : "people"}`);
    if (ok && notify) {
      const res = await callApi(`/api/forms/${form.id}/invite`, { method: "POST", body: { emails: lower, message: `You've been given access to “${form.name}”.`, signed: false } });
      if (res.status === 409) toast.message("Access saved. No email sent — the form isn't published yet.");
      else if (!res.ok) toast.error(res.data?.error || "Access saved, but the email couldn't be sent.");
      else if (res.data?.configured === false) toast.message("Access saved. Email isn't configured (RESEND_API_KEY), so no link was sent.");
    }
    return ok;
  };

  const changeRole = (row, role) =>
    writeSharing(row.form, (row.form.settings.sharing || []).map((s) => (s.email === row.email ? { ...s, role } : s)), "Role updated");
  const removeRow = (row) =>
    writeSharing(row.form, (row.form.settings.sharing || []).filter((s) => s.email !== row.email), `Removed ${row.email}`);

  const columns = [
    {
      key: "person",
      header: "Person",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-hover text-[10px] font-semibold text-muted-foreground">{initials(r.email)}</div>
          <span className="truncate text-sm text-foreground">{r.email}</span>
        </div>
      ),
    },
    {
      key: "form",
      header: "Form",
      render: (r) => (
        <Button type="button" variant="link" onClick={() => openForm(r.form.id, "access")} className="h-auto p-0 text-left text-sm font-normal text-muted-foreground hover:text-foreground">
          {r.form.name}
        </Button>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (r) => (canInvite ? <RoleSelect value={r.role} onChange={(v) => changeRole(r, v)} /> : <Badge variant="neutral">{ROLE_LABEL[r.role] || r.role}</Badge>),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      className: "text-right",
      render: (r) =>
        canInvite ? (
          <Button size="icon" variant="ghost" aria-label={`Remove ${r.email}`} onClick={() => removeRow(r)} className="h-8 w-8 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null,
    },
  ];

  return (
    <MainScreenWrapper>
      <ScreenHeader
        title="Shared"
        description="Who has been given access to which forms, and the workspace roles that govern what they can do."
        actions={
          canInvite ? (
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setSharing(true)} disabled={!forms.length}>
              <UserPlus className="h-4 w-4" /> Share a form
            </Button>
          ) : null
        }
      />

      <StatsBar stats={stats} />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search people or forms…" className="w-full sm:max-w-xs" />
      </Toolbar>

      {loading ? (
        <LoadingArea panel size={40} label="Loading shared forms" />
      ) : error ? (
        <ErrorState title="Couldn't load shared forms" onRetry={refresh} />
      ) : (
        <div className="space-y-5">
          <DataTable
            columns={columns}
            data={pager.pageItems}
            getRowKey={(r) => r.key}
            empty={
              <div className="rounded-xl border border-border bg-surface-subtle">
                <EmptyState
                  icon={Share2}
                  title={rows.length ? "No one matches" : "No forms shared yet"}
                  description={rows.length ? "Try a different search." : "Share a form with teammates to collaborate on it."}
                  action={
                    rows.length ? (
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    ) : canInvite && forms.length ? (
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setSharing(true)}>
                        <UserPlus className="h-4 w-4" /> Share a form
                      </Button>
                    ) : null
                  }
                />
              </div>
            }
          />
          <ListPagination {...pager} itemLabel="people" />
        </div>
      )}

      {roles?.length ? (
        <SectionCard title="Workspace roles" description="Manage roles and members from the workspace Roles & Team screens.">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-card px-3 py-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{r.name}</p>
                  <p className="truncate text-[11px] text-text-tertiary">{r.description || `${(r.permissions || []).length} permissions`}</p>
                </div>
                <span className="text-sm tabular-nums text-muted-foreground">{r.members}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <ShareDialog open={sharing} forms={forms.filter((f) => f.status !== "Archived")} onClose={() => setSharing(false)} onShare={share} />
    </MainScreenWrapper>
  );
}

export default SharedScreen;
