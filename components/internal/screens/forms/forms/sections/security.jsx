"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Lock, MinusCircle } from "lucide-react";

import { Badge } from "@geiger/ui/badge";
import { Button } from "@geiger/ui/button";
import { SectionCard, StatsBar } from "@geiger/ui/screen-kit";
import { listAccess } from "@/lib/supabase/audit";
import { fieldTypeLabel } from "@/lib/forms/logic";
import { cn } from "@/lib/utils";
import { BuilderLink, Stack, inputFields } from "./kit";

const ACTION_LABELS = { view: "Viewed", reveal: "Revealed", export: "Exported", print: "Printed", edit: "Edited" };

function CheckItem({ state, title, hint }) {
  const Icon = state === "on" ? CheckCircle2 : state === "manual" ? CircleDashed : MinusCircle;
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", state === "on" ? "text-emerald-400" : state === "manual" ? "text-amber-400" : "text-text-tertiary")} />
      <div className="min-w-0">
        <p className="text-sm text-foreground">{title}</p>
        <p className="text-xs text-text-secondary">{hint}</p>
      </div>
    </li>
  );
}

// Sensitive (ePHI) fields, access log, residency and a HIPAA readiness checklist.
export function SecuritySection({ form, settings, openBuilder, navigate }) {
  const sensitive = inputFields(form.fieldDefs).filter((f) => f.sensitive);
  const [log, setLog] = useState(null);

  useEffect(() => {
    let alive = true;
    listAccess({ formId: form.id, limit: 25 })
      .then((rows) => alive && setLog(rows))
      .catch(() => alive && setLog([]));
    return () => {
      alive = false;
    };
  }, [form.id]);

  const access = settings.access || {};
  const checklist = [
    { state: sensitive.length ? "on" : "off", title: "Sensitive fields marked", hint: sensitive.length ? `${sensitive.length} field(s) encrypted and masked.` : "Mark health or financial fields as sensitive in the builder." },
    { state: "manual", title: "Encryption key configured", hint: "Set FORMS_ENCRYPTION_KEY (32 random bytes, base64) on the server — without it sensitive answers are stored unencrypted." },
    { state: access.mode && access.mode !== "public" ? "on" : "off", title: "Restricted access", hint: "Use sign-in, domain or signed-link access for patient forms." },
    { state: settings.retentionDays ? "on" : "off", title: "Retention policy", hint: settings.retentionDays ? `Responses are erased after ${settings.retentionDays} days.` : "Set “Delete responses after” in Access & Sharing." },
    { state: (settings.notifyEmails || []).length === 0 && !settings.slackWebhookUrl ? "on" : "off", title: "No answers in plain-text alerts", hint: "Email and Slack alerts mask sensitive fields, but keep the recipient list minimal." },
    { state: "on", title: "Access log", hint: "Every view, reveal, export and print of a response is recorded below." },
    { state: "manual", title: "Business Associate Agreement", hint: "Sign a BAA with your hosting and database providers before collecting ePHI." },
  ];
  const ready = checklist.filter((c) => c.state === "on").length;

  return (
    <Stack>
      <StatsBar
        columns={3}
        stats={[
          { label: "Sensitive fields", value: String(sensitive.length), footer: "Encrypted at rest" },
          { label: "Access events", value: log ? String(log.length) : null, footer: "Most recent 25" },
          { label: "Readiness", value: `${ready}/${checklist.length}`, footer: "HIPAA checklist" },
        ]}
      />

      <SectionCard title="Sensitive fields" description="Answers are encrypted with AES-256-GCM before they're stored, masked in the inbox, and only revealed on request (which is logged).">
        {sensitive.length ? (
          <div className="flex flex-wrap gap-2">
            {sensitive.map((f) => (
              <Badge key={f.id} variant="warning">
                <Lock /> {f.label || f.title} · {fieldTypeLabel(f.type)}
              </Badge>
            ))}
          </div>
        ) : (
          <BuilderLink onOpenBuilder={openBuilder}>No sensitive fields. Toggle “Sensitive” on a field in the builder to encrypt and mask it.</BuilderLink>
        )}
      </SectionCard>

      <SectionCard title="HIPAA readiness" description={<>Geiger Forms provides the controls; compliance also depends on your agreements and processes. <Button type="button" variant="link" className="h-auto p-0 font-normal text-inherit underline hover:text-foreground" onClick={() => navigate("access")}>Access settings</Button></>}>
        <ul className="divide-y divide-border">
          {checklist.map((c) => (
            <CheckItem key={c.title} {...c} />
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Access log">
        {log === null ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : log.length ? (
          <div className="divide-y divide-border">
            {log.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <Badge variant={e.action === "reveal" ? "warning" : "neutral"}>{ACTION_LABELS[e.action] || e.action}</Badge>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {e.actorName}
                  {e.fieldId ? ` · ${form.fieldDefs.find((f) => f.id === e.fieldId)?.title || e.fieldId}` : ""}
                </span>
                <span className="shrink-0 text-xs text-text-tertiary">{e.when}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No one has opened a response yet.</p>
        )}
      </SectionCard>

    </Stack>
  );
}
