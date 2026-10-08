"use client";

import { useEffect, useState } from "react";
import { Bell, Building2, Code2, EyeOff, FolderOpen, KeyRound, Loader2, Palette, RotateCcw, Save, ShieldCheck, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@geiger/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@geiger/ui/select";
import { SecondaryScreenWrapper } from "@/components/internal/shared/screen_wrappers";
import {
  Field,
  LoadingArea,
  ScreenHeader,
  SectionCard,
  SettingRow,
  SettingsList,
} from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { useCan } from "@/context/rbac-context";
import { callApi } from "@/lib/forms/api";
import { useForms } from "@/lib/hooks/use-forms";
import { useWorkspaceUrl } from "@/lib/hooks/use-workspace-url";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/supabase/api_keys";
import { cn } from "@/lib/utils";
import { LOCALES } from "../forms/constants";
import { ChipsInput, CopyField, DisabledHint, FIELD_CLS, Note, NumberInput, OUTLINE_BTN, TextInput, isEmail } from "../forms/sections/kit";
import { ErrorState } from "../screen-shell";
import { folderNames, useWorkspaceSettings } from "./use_workspace_settings";

const TIMEZONES = ["UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Sao_Paulo", "Europe/London", "Europe/Berlin", "Europe/Paris", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland"];
const HEX_RE = /^#[0-9a-f]{6}$/i;
const DOMAIN_RE = /^(\*\.)?([a-z0-9-]+\.)+[a-z]{2,}$/i;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function PlainSelect({ value, onChange, options, className }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("h-9", FIELD_CLS, className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ApiKeysCard({ projectId, canManage }) {
  const [keys, setKeys] = useState(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState(["read"]);
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState(null);
  const [revoke, setRevoke] = useState(null);

  useEffect(() => {
    let alive = true;
    listApiKeys(projectId || null)
      .then((rows) => alive && setKeys(rows))
      .catch((err) => {
        console.error("[settings.apiKeys]", err);
        if (alive) setKeys([]);
      });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const create = async () => {
    if (!name.trim()) return toast.error("Name the key so you know where it's used.");
    setBusy(true);
    try {
      const { key, secret: plain } = await createApiKey({ projectId: projectId || null, name: name.trim(), scopes });
      setKeys((cur) => [key, ...(cur || [])]);
      setSecret(plain);
      setName("");
    } catch (err) {
      console.error("[settings.createKey]", err);
      toast.error("Couldn't create the key.");
    } finally {
      setBusy(false);
    }
  };

  const confirmRevoke = async () => {
    const target = revoke;
    setRevoke(null);
    const previous = keys;
    setKeys((cur) => cur.filter((k) => k.id !== target.id));
    try {
      await revokeApiKey(target.id);
      toast.success("Key revoked");
    } catch (err) {
      console.error("[settings.revokeKey]", err);
      setKeys(previous);
      toast.error("Couldn't revoke the key.");
    }
  };

  const toggleScope = (scope, on) => setScopes((cur) => (on ? [...new Set([...cur, scope])] : cur.filter((s) => s !== scope)));

  return (
    <SectionCard title="API keys" description="Bearer keys for the REST API (/api/v1). Keys are shown once — store them somewhere safe.">
      <div className="grid gap-4">
        {canManage ? (
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <Field label="Key name">
              <TextInput value={name} onChange={setName} placeholder="e.g. Zapier, data warehouse" />
            </Field>
            <div className="flex h-9 items-center gap-3 text-sm text-muted-foreground">
              {["read", "write"].map((s) => (
                <label key={s} className="flex cursor-pointer items-center gap-1.5 capitalize">
                  <Checkbox checked={scopes.includes(s)} onCheckedChange={(v) => toggleScope(s, Boolean(v))} /> {s}
                </label>
              ))}
            </div>
            <Button onClick={create} disabled={busy || !scopes.length} className="h-9 bg-primary text-primary-foreground hover:bg-primary/90">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Create key
            </Button>
          </div>
        ) : null}
        {keys === null ? (
          <p className="text-sm text-text-secondary">Loading keys…</p>
        ) : keys.length ? (
          <div className="divide-y divide-border rounded-lg border border-border bg-surface-card">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-3 py-2.5">
                <KeyRound className="h-4 w-4 shrink-0 text-text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{k.name}</p>
                  <p className="truncate text-[11px] text-text-tertiary">
                    <code>{k.prefix}…</code> · created {k.created} · last used {k.lastUsed}
                  </p>
                </div>
                <div className="hidden gap-1 sm:flex">
                  {k.scopes.map((s) => (
                    <Badge key={s} variant="neutral">
                      {s}
                    </Badge>
                  ))}
                </div>
                {canManage ? (
                  <Button size="icon" variant="ghost" aria-label={`Revoke ${k.name}`} onClick={() => setRevoke(k)} className="h-8 w-8 text-text-secondary hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No API keys yet.</p>
        )}
      </div>

      <Dialog open={Boolean(secret)} onOpenChange={(v) => !v && setSecret(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy your API key</DialogTitle>
            <DialogDescription>This is the only time the full key is shown. Use it as a Bearer token.</DialogDescription>
          </DialogHeader>
          {secret ? <CopyField value={secret} label="API key copied" /> : null}
          <DialogFooter>
            <Button onClick={() => setSecret(null)} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revoke)} onOpenChange={(v) => !v && setRevoke(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke API key</DialogTitle>
            <DialogDescription>
              Integrations using <span className="font-medium text-foreground">{revoke?.name}</span> stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRevoke(null)}>
              Cancel
            </Button>
            <Button className="bg-red-500/90 text-white hover:bg-red-500" onClick={confirmRevoke}>
              <Trash2 className="h-4 w-4" /> Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function EraseCard({ canManage }) {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const erase = async () => {
    setBusy(true);
    const res = await callApi("/api/workspace/erase", { method: "POST", body: { email: email.trim().toLowerCase() } });
    setBusy(false);
    setConfirming(false);
    if (res.ok) {
      const count = res.data?.count ?? 0;
      const partials = res.data?.partials ?? 0;
      toast.success(`Erased ${count} response${count === 1 ? "" : "s"}${partials ? ` and ${partials} partial${partials === 1 ? "" : "s"}` : ""} for ${email.trim()}`);
      setEmail("");
    } else toast.error(res.data?.error || "Couldn't erase this respondent's data.");
  };
  return (
    <SectionCard title="Right to erasure (GDPR)" description="Permanently delete every response, partial and uploaded file submitted with an email address.">
      <div className="flex flex-col gap-2 sm:flex-row">
        <TextInput value={email} onChange={setEmail} placeholder="respondent@example.com" className="flex-1" disabled={!canManage} />
        <DisabledHint when={!canManage} hint="Only workspace admins can erase data.">
          <Button variant="outline" onClick={() => (isEmail(email) ? setConfirming(true) : toast.error("Enter a valid email address."))} disabled={!canManage || !email} className="h-9 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300">
            <UserX className="h-4 w-4" /> Erase data
          </Button>
        </DisabledHint>
      </div>
      <Dialog open={confirming} onOpenChange={(v) => !v && !busy && setConfirming(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Erase all data for {email.trim()}?</DialogTitle>
            <DialogDescription>This permanently deletes their responses, partial saves and uploaded files across every form. It can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
            <Button className="bg-red-500/90 text-white hover:bg-red-500" onClick={erase} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Erase permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

// Workspace-wide settings, persisted to forms.workspace_settings.
export function SettingsScreen() {
  const workspace = useWorkspaceSettings();
  const { forms } = useForms();
  const { setView } = useWorkspaceUrl();
  const canManage = useCan("forms.settings.manage");
  const [draft, setDraft] = useState(workspace.settings);
  const [seed, setSeed] = useState(workspace.settings);
  const [saving, setSaving] = useState(false);

  // Re-seed the draft whenever the stored settings change underneath it.
  if (seed !== workspace.settings) {
    setSeed(workspace.settings);
    setDraft(workspace.settings);
  }

  const dirty = !same(draft, workspace.settings);
  const set = (key) => (value) => setDraft((d) => ({ ...d, [key]: value }));
  const timezones = TIMEZONES.includes(draft.timezone) ? TIMEZONES : [draft.timezone, ...TIMEZONES].filter(Boolean);
  const folderCount = folderNames(workspace.settings, forms).length;

  const save = async () => {
    if (draft.brandAccent && !HEX_RE.test(draft.brandAccent)) return toast.error("The accent colour must be a 6-digit hex value.");
    setSaving(true);
    try {
      await workspace.save(draft);
      toast.success("Settings saved");
    } catch (err) {
      console.error("[settings.save]", err);
      toast.error("Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SecondaryScreenWrapper>
      <ScreenHeader
        title="Settings"
        description="Workspace defaults for new forms, branding, notifications, embedding and API access."
        actions={
          <>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(workspace.settings)} disabled={saving} className="text-muted-foreground hover:bg-surface-active hover:text-foreground">
                <RotateCcw className="h-4 w-4" /> Discard
              </Button>
            ) : null}
            <DisabledHint when={!canManage} hint="Only workspace admins can change settings.">
              <Button onClick={save} disabled={!canManage || !dirty || saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {dirty ? "Save settings" : "Saved"}
              </Button>
            </DisabledHint>
          </>
        }
      />

      {workspace.loading ? (
        <LoadingArea panel size={40} label="Loading settings" />
      ) : workspace.error ? (
        <ErrorState title="Couldn't load settings" onRetry={workspace.refresh} />
      ) : (
        <fieldset disabled={!canManage} className="space-y-6">
          {dirty ? <Note tone="warning">You have unsaved changes.</Note> : null}

          <SectionCard title="Workspace">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Workspace name" className="sm:col-span-2">
                <TextInput value={draft.workspaceName} onChange={set("workspaceName")} />
              </Field>
              <Field label="Timezone" hint="Used for schedules, reports and dates in exports.">
                <PlainSelect value={draft.timezone || "UTC"} onChange={set("timezone")} options={timezones.map((t) => ({ value: t, label: t.replace(/_/g, " ") }))} />
              </Field>
              <Field label="Default form language">
                <PlainSelect value={draft.locale || "en"} onChange={set("locale")} options={LOCALES} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="New form defaults" description="Applied when someone creates a form or uses a template.">
            <SettingsList>
              <SettingRow
                icon={Building2}
                title="Starting status"
                control={(
                  <Tabs value={draft.defaultStatus || "Draft"} onValueChange={set("defaultStatus")}>
                    <TabsList>
                      <TabsTrigger value="Draft">Draft</TabsTrigger>
                      <TabsTrigger value="Published">Published</TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}
              />
              <SettingRow icon={ShieldCheck} title="Require CAPTCHA" description="Turn on the Turnstile challenge for new forms." checked={Boolean(draft.requireCaptcha)} onCheckedChange={set("requireCaptcha")} />
              <SettingRow icon={EyeOff} title="Anonymous by default" description="Don't store IP hash, user agent or signed-in user." checked={Boolean(draft.anonymiseByDefault)} onCheckedChange={set("anonymiseByDefault")} />
              <SettingRow
                icon={Trash2}
                title="Delete responses after (days)"
                description="Empty keeps responses until deleted."
                control={<NumberInput value={draft.defaultRetentionDays} min={1} placeholder="Forever" onChange={set("defaultRetentionDays")} className="w-28" />}
              />
            </SettingsList>
          </SectionCard>

          <SectionCard title="Branding" description="Default look for new forms.">
            <div className="grid gap-4">
              <Field label="Accent colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Accent colour"
                    value={HEX_RE.test(draft.brandAccent || "") ? draft.brandAccent : "#6366f1"}
                    onChange={(e) => set("brandAccent")(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded-md border border-border bg-surface-card p-1"
                  />
                  <TextInput value={draft.brandAccent} onChange={(v) => set("brandAccent")(v.trim())} placeholder="#6366f1" className="w-36 font-mono" />
                  {draft.brandAccent ? (
                    <Button variant="ghost" size="sm" onClick={() => set("brandAccent")("")} className="text-text-secondary">
                      Clear
                    </Button>
                  ) : null}
                </div>
              </Field>
              <Field label="Logo URL">
                <TextInput value={draft.brandLogoUrl} onChange={set("brandLogoUrl")} placeholder="https://…/logo.svg" />
              </Field>
              <SettingsList>
                <SettingRow icon={Palette} title="Hide Geiger branding" description="Remove the “Powered by Geiger Forms” footer on new forms." checked={Boolean(draft.hideBranding)} onCheckedChange={set("hideBranding")} />
              </SettingsList>
            </div>
          </SectionCard>

          <SectionCard title="Notifications">
            <SettingsList>
              <SettingRow icon={Bell} title="Notify me on new responses" description="In-app notifications for every submission." checked={draft.notifyOnSubmit !== false} onCheckedChange={set("notifyOnSubmit")} />
            </SettingsList>
            <Field label="Weekly digest recipients" hint="A Monday (UTC) summary across all forms." className="mt-4">
              <ChipsInput value={draft.digestEmails || []} onChange={set("digestEmails")} placeholder="team@company.com" />
            </Field>
          </SectionCard>

          <SectionCard title="Embedding" description="Only these sites may embed your forms. Leave empty to allow any site.">
            <ChipsInput
              value={draft.allowedEmbedDomains || []}
              onChange={set("allowedEmbedDomains")}
              placeholder="example.com, *.example.org"
              validate={(v) => DOMAIN_RE.test(v.replace(/^https?:\/\//, ""))}
              invalidMessage="Enter a domain like example.com or *.example.com."
            />
            <p className="mt-2 flex items-center gap-1.5 text-xs text-text-tertiary">
              <Code2 className="h-3.5 w-3.5" /> Find embed snippets in each form&apos;s editor under Sharing → Embed.
            </p>
          </SectionCard>

          <SectionCard
            title="Folders"
            description={`${folderCount} folder${folderCount === 1 ? "" : "s"} organise this workspace's forms.`}
            action={
              <Button type="button" variant="outline" size="sm" onClick={() => setView("Folders")} className={OUTLINE_BTN}>
                <FolderOpen className="h-3.5 w-3.5" /> Manage folders
              </Button>
            }
          >
            <p className="text-sm text-text-secondary">Create, rename and delete folders, and move forms between them, from the Folders screen.</p>
          </SectionCard>
        </fieldset>
      )}

      {!workspace.loading && !workspace.error ? (
        <>
          <ApiKeysCard projectId={workspace.projectId} canManage={canManage} />
          <EraseCard canManage={canManage} />
        </>
      ) : null}
    </SecondaryScreenWrapper>
  );
}

export default SettingsScreen;
