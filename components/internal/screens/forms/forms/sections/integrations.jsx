"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Send, Wand2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { Checkbox } from "@geiger/ui/checkbox";
import { Switch } from "@geiger/ui/switch";
import { Field, SectionCard, SettingRow, SettingsList } from "@geiger/ui/screen-kit";
import { Tabs, TabsList, TabsTrigger } from "@geiger/ui/tabs";
import { callApi } from "@/lib/forms/api";
import { relativeTime } from "@/lib/forms/schema";
import { withPrefix } from "@/lib/workspace/base-path";
import { WEBHOOK_EVENTS } from "../constants";
import { AddButton, ChipsInput, CopyField, ItemCard, OUTLINE_BTN, Stack, TextInput, randomHex, uid, useOrigin } from "./kit";

const URL_RE = /^https?:\/\/\S+\.\S+/i;

function WebhookCard({ hook, formId, onChange, onRemove }) {
  const [testing, setTesting] = useState(false);
  const test = async () => {
    if (!URL_RE.test(hook.url || "")) return toast.error("Enter a valid https:// URL first.");
    setTesting(true);
    const res = await callApi(`/api/forms/${formId}/test-webhook`, { method: "POST", body: { url: hook.url, secret: hook.secret } });
    setTesting(false);
    if (res.ok) toast.success(`Test delivered${res.data?.status ? ` (HTTP ${res.data.status})` : ""}`);
    else toast.error(res.data?.error || `Test failed${res.data?.status ? ` (HTTP ${res.data.status})` : ""}`);
  };
  const toggleEvent = (event, on) => {
    const events = new Set(hook.events || []);
    if (on) events.add(event);
    else events.delete(event);
    onChange({ events: [...events] });
  };
  return (
    <ItemCard onRemove={onRemove} removeLabel="Remove webhook">
      <div className="grid gap-3 pr-8">
        <div className="flex items-center gap-2">
          <Switch checked={hook.enabled !== false} onCheckedChange={(v) => onChange({ enabled: v })} aria-label="Webhook enabled" />
          <Badge variant={hook.enabled !== false ? "success" : "neutral"}>{hook.enabled !== false ? "Active" : "Paused"}</Badge>
        </div>
        <Field label="Endpoint URL">
          <TextInput value={hook.url} onChange={(v) => onChange({ url: v.trim() })} placeholder="https://hooks.example.com/forms" />
        </Field>
        <Field label="Signing secret" hint="Sent as an HMAC-SHA256 signature header so you can verify each delivery.">
          <div className="flex gap-2">
            <TextInput value={hook.secret} onChange={(v) => onChange({ secret: v.trim() })} className="flex-1 font-mono text-xs" placeholder="whsec_…" />
            <Button type="button" variant="outline" onClick={() => onChange({ secret: `whsec_${randomHex(24)}` })} className={`h-9 shrink-0 ${OUTLINE_BTN}`}>
              <Wand2 className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
        </Field>
        <Field label="Events">
          <div className="flex flex-wrap gap-3">
            {WEBHOOK_EVENTS.map((e) => (
              <label key={e.value} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={(hook.events || []).includes(e.value)} onCheckedChange={(v) => toggleEvent(e.value, Boolean(v))} />
                {e.label}
              </label>
            ))}
          </div>
        </Field>
        <div>
          <Button type="button" variant="outline" size="sm" onClick={test} disabled={testing} className={OUTLINE_BTN}>
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send test
          </Button>
        </div>
      </div>
    </ItemCard>
  );
}

function Deliveries({ formId }) {
  const [rows, setRows] = useState(null);
  const load = useCallback(async () => {
    setRows(null);
    const res = await callApi(`/api/forms/${formId}/deliveries`);
    setRows(res.ok ? res.data?.deliveries || [] : []);
  }, [formId]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);
  return (
    <SectionCard
      title="Recent deliveries"
      action={
        <Button type="button" size="icon" variant="ghost" aria-label="Refresh deliveries" onClick={load} className="h-8 w-8 text-muted-foreground hover:bg-surface-active hover:text-foreground">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {rows === null ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
        </div>
      ) : rows.length ? (
        <div className="divide-y divide-border">
          {rows.slice(0, 20).map((d, i) => {
            const status = d.statusCode ?? d.status_code;
            const ok = d.ok ?? (Number(status) >= 200 && Number(status) < 300);
            return (
              <div key={d.id || i} className="flex items-center gap-3 py-2.5 text-sm">
                <Badge variant={ok ? "success" : "danger"}>{status || (ok ? "OK" : "Failed")}</Badge>
                <span className="min-w-0 flex-1 truncate text-muted-foreground" title={d.error || undefined}>
                  {d.event || "delivery"} → {d.url}
                  {d.error ? <span className="text-red-400"> · {d.error}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-text-tertiary">{relativeTime(d.created_at || d.createdAt)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">No deliveries yet.</p>
      )}
    </SectionCard>
  );
}

// Webhooks, Slack, Geiger Flow / Assets, and no-code connectors.
export function IntegrationsSection({ form, settings, set, setGroup }) {
  const origin = useOrigin();
  const hooks = settings.webhooks || [];
  const flow = settings.flow || {};
  const updateHook = (id, patch) => set("webhooks", hooks.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  const addHook = () => set("webhooks", [...hooks, { id: uid("wh"), url: "", secret: `whsec_${randomHex(24)}`, events: ["response.created"], enabled: true }]);

  return (
    <Stack>
      <SectionCard title="Webhooks" description="POST each response as JSON to your endpoint. Retries automatically on failure." action={<AddButton onClick={addHook}>Add webhook</AddButton>}>
        {hooks.length ? (
          <div className="space-y-3">
            {hooks.map((h) => (
              <WebhookCard key={h.id} hook={h} formId={form.id} onChange={(patch) => updateHook(h.id, patch)} onRemove={() => set("webhooks", hooks.filter((x) => x.id !== h.id))} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No webhooks yet.</p>
        )}
      </SectionCard>

      {hooks.length ? <Deliveries formId={form.id} /> : null}

      <SectionCard title="Slack" description="Post a message to a channel for every new response.">
        <Field label="Incoming webhook URL" hint="Slack → Apps → Incoming Webhooks → Add to channel.">
          <TextInput value={settings.slackWebhookUrl} onChange={(v) => set("slackWebhookUrl", v.trim())} placeholder="https://hooks.slack.com/services/…" />
        </Field>
      </SectionCard>

      <SectionCard title="Geiger Flow" description="Turn responses into Flow issues. Needs this workspace to be linked to a Geiger Flow project — otherwise escalation is skipped.">
        <SettingsList>
          <SettingRow title="Escalate to Flow" checked={Boolean(flow.escalate)} onCheckedChange={(v) => setGroup("flow", { escalate: v })} />
        </SettingsList>
        {flow.escalate ? (
          <div className="mt-4 grid gap-4">
            <Field label="Create an issue when">
              <Tabs value={flow.when || "high"} onValueChange={(v) => setGroup("flow", { when: v })}>
                <TabsList>
                  <TabsTrigger value="high">Priority is High</TabsTrigger>
                  <TabsTrigger value="always">Every response</TabsTrigger>
                  <TabsTrigger value="outcome">Outcome matches</TabsTrigger>
                </TabsList>
              </Tabs>
            </Field>
            {flow.when === "outcome" ? (
              <Field label="Outcome name" className="max-w-sm">
                <TextInput value={flow.outcome} onChange={(v) => setGroup("flow", { outcome: v })} placeholder="Qualified lead" />
              </Field>
            ) : null}
            <Field label="Issue labels">
              <ChipsInput value={flow.labels || []} onChange={(v) => setGroup("flow", { labels: v })} placeholder="form" validate={(v) => v.length <= 40} invalidMessage="Labels are up to 40 characters." />
            </Field>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Geiger Assets">
        <SettingsList>
          <SettingRow title="Sync uploads to Assets" description="Copy files respondents upload into this project's Geiger Assets library." checked={Boolean(settings.assets?.sync)} onCheckedChange={(v) => setGroup("assets", { sync: v })} />
        </SettingsList>
      </SectionCard>

      <SectionCard title="Google Sheets, Zapier & Make" description="Connect any tool with a webhook or the REST API.">
        <div className="grid gap-3 text-sm text-text-secondary">
          <p>
            <span className="font-medium text-foreground">Zapier / Make:</span> add a “Catch hook” trigger and paste its URL as a webhook above. Each response arrives as JSON with answers keyed by field id and label.
          </p>
          <p>
            <span className="font-medium text-foreground">Google Sheets:</span> use a Zapier or Make scenario (“Webhook → Add row”), or pull responses on a schedule from the REST API with an API key from Settings.
          </p>
          <CopyField value={`${origin}${withPrefix(`/api/v1/forms/${form.id}/responses`)}`} label="API endpoint copied" />
        </div>
      </SectionCard>
    </Stack>
  );
}
