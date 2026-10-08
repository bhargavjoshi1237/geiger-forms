"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleDot,
  Download,
  Eye,
  FileDown,
  History,
  Loader2,
  Pencil,
  Printer,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { LogoLoading } from "@geiger/ui/logo-loading";
import { Button } from "@geiger/ui/button";
import { Input } from "@geiger/ui/input";
import { Textarea } from "@geiger/ui/textarea";
import { cn } from "@/lib/utils";
import { StatusPill } from "@geiger/ui/screen-kit";
import { useComments } from "@/lib/hooks/use-comments";
import { listAccess, listActivity } from "@/lib/supabase/audit";
import { normalizeResponse } from "@/lib/supabase/responses";
import { callApi } from "@/lib/forms/api";
import { computeOrder, formatMoney } from "@/lib/forms/logic";
import { outcomeLabel, responseFileUrl } from "@/lib/forms/response-utils";
import {
  PAYMENT_STATUS_MAP,
  avatarColor,
  formatDateTime,
  formatDuration,
} from "@/components/internal/screens/forms/responses/constants";

function SectionBlock({ title, children, action }) {
  return (
    <div className="rounded-lg border border-border bg-surface-card p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Rows({ items }) {
  const shown = items.filter((i) => i && i.value != null && i.value !== "");
  if (!shown.length) return <p className="text-xs text-text-tertiary">Nothing recorded.</p>;
  return (
    <dl className="grid grid-cols-[minmax(0,40%)_1fr] gap-x-4 gap-y-2">
      {shown.map((i) => (
        <div key={i.label} className="contents">
          <dt className="text-[11px] text-text-tertiary">{i.label}</dt>
          <dd className="min-w-0 break-words text-right text-[11px] text-muted-foreground">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Loading() {
  return (
    <div className="flex min-h-32 items-center justify-center">
      <LogoLoading size={36} aria-label="Loading" />
    </div>
  );
}

export function parseUserAgent(ua) {
  if (!ua) return { device: "", browser: "", os: "" };
  const device = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";
  let browser = "Other";
  if (/Edg/.test(ua)) browser = "Edge";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome/.test(ua)) browser = "Chrome";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua)) browser = "Safari";
  let os = "Other";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iOS/.test(ua)) os = "iOS";
  else if (/Mac OS|Macintosh/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Linux/.test(ua)) os = "Linux";
  return { device, browser, os };
}

// --- Approvals ---------------------------------------------------------------

const DECISION_ICON = { approve: CheckCircle2, approved: CheckCircle2, reject: XCircle, rejected: XCircle };

export function ApprovalsSection({ response, form, onReplace }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(null);
  const config = form?.settings?.approval || { enabled: false, steps: [] };
  const steps = config.steps || [];
  const approval = response.approval || {};
  const history = Array.isArray(approval.history) ? approval.history : [];
  const stepIndex = Number(approval.stepIndex ?? 0);
  const state = approval.state || (config.enabled ? "pending" : null);
  const decided = state === "approved" || state === "rejected";

  if (!config.enabled && !history.length) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-tertiary">
        Approvals are off for this form. Enable an approval chain under the form&apos;s Workflow settings.
      </p>
    );
  }

  const decide = async (decision) => {
    setBusy(decision);
    const { ok, data } = await callApi(`/api/responses/${response.id}/approve`, {
      method: "POST",
      body: { decision, note: note.trim() },
    });
    setBusy(null);
    if (!ok) return toast.error(data?.error || "Couldn't record the decision.");
    if (data.response) {
      const next = normalizeResponse(data.response);
      onReplace?.({ ...next, form: response.form, formSlug: response.formSlug, projectId: response.projectId ?? next.projectId });
    }
    setNote("");
    toast.success(decision === "approve" ? "Approved" : "Rejected");
  };

  return (
    <div className="space-y-3">
      <SectionBlock title="Approval chain" action={state ? <StatusPill status={state} map={APPROVAL_STATE_MAP} /> : null}>
        {steps.length ? (
          <ol className="space-y-2">
            {steps.map((step, i) => {
              const done = history.find((h) => Number(h.stepIndex) === i && /approve/.test(h.decision));
              const rejected = history.find((h) => Number(h.stepIndex) === i && /reject/.test(h.decision));
              const current = !decided && i === stepIndex;
              const Icon = rejected ? XCircle : done ? CheckCircle2 : current ? CircleDot : Circle;
              return (
                <li key={step.id || i} className="flex items-start gap-2.5">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", rejected ? "text-red-400" : done ? "text-emerald-400" : current ? "text-amber-400" : "text-text-tertiary")} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground">{step.name || `Step ${i + 1}`}</p>
                    <p className="truncate text-[11px] text-text-tertiary">{(step.approvers || []).join(", ") || "Any workspace member"}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-xs text-text-tertiary">No steps configured.</p>
        )}
      </SectionBlock>

      {config.enabled && !decided ? (
        <SectionBlock title={`Decision · ${steps[stepIndex]?.name || `Step ${stepIndex + 1}`}`}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note (optional)" className="text-xs" />
          <div className="mt-2 flex gap-2">
            <Button type="button" size="sm" className="flex-1 bg-emerald-500/90 text-white hover:bg-emerald-500" onClick={() => decide("approve")} disabled={Boolean(busy)}>
              {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve
            </Button>
            <Button type="button" size="sm" variant="outline" className="flex-1 border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => decide("reject")} disabled={Boolean(busy)}>
              {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Reject
            </Button>
          </div>
        </SectionBlock>
      ) : null}

      <SectionBlock title="History">
        {history.length ? (
          <ul className="space-y-2.5">
            {[...history].reverse().map((h, i) => {
              const Icon = DECISION_ICON[h.decision] || History;
              return (
                <li key={`${h.at}-${i}`} className="flex gap-2.5">
                  <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", /reject/.test(h.decision) ? "text-red-400" : "text-emerald-400")} />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{h.by || h.byEmail || "Someone"}</span>{" "}
                      <span className="text-text-secondary">{/reject/.test(h.decision) ? "rejected" : "approved"} {h.stepName || `step ${Number(h.stepIndex) + 1}`}</span>
                    </p>
                    {h.note ? <p className="mt-0.5 text-[11px] text-muted-foreground">“{h.note}”</p> : null}
                    <p className="text-[10px] text-text-tertiary">{formatDateTime(h.at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-text-tertiary">No decisions yet.</p>
        )}
      </SectionBlock>
    </div>
  );
}

const APPROVAL_STATE_MAP = {
  pending: { label: "Pending", variant: "warning", dotClass: "bg-amber-400" },
  approved: { label: "Approved", variant: "success", dotClass: "bg-emerald-400" },
  rejected: { label: "Rejected", variant: "danger", dotClass: "bg-red-400" },
};

// --- Payment -------------------------------------------------------------------

export function PaymentSection({ response, form }) {
  const payment = response.payment;
  const order = useMemo(() => (form ? computeOrder(form, response.answers || {}) : null), [form, response.answers]);
  if (!payment && !order?.items?.length) {
    return <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-tertiary">No payment was collected with this response.</p>;
  }
  const currency = payment?.currency || order?.currency || "usd";
  return (
    <div className="space-y-3">
      {payment ? (
        <SectionBlock title="Payment" action={<StatusPill status={payment.status} map={PAYMENT_STATUS_MAP} />}>
          <Rows
            items={[
              { label: "Amount", value: formatMoney(payment.amount, currency) },
              { label: "Currency", value: currency.toUpperCase() },
              { label: "Reference", value: payment.ref ? <span className="font-mono">{payment.ref}</span> : "" },
            ]}
          />
        </SectionBlock>
      ) : null}
      {order?.items?.length ? (
        <SectionBlock title="Order">
          <ul className="space-y-1.5 text-xs">
            {order.items.map((item) => (
              <li key={item.fieldId} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{item.quantity} × {item.name}</span>
                <span className="tabular-nums text-foreground">{formatMoney(item.amount, currency)}</span>
              </li>
            ))}
            {order.discount ? (
              <li className="flex justify-between gap-2 text-emerald-400">
                <span>Coupon {order.coupon?.code}</span>
                <span className="tabular-nums">−{formatMoney(order.discount, currency)}</span>
              </li>
            ) : null}
            <li className="flex justify-between gap-2 border-t border-border pt-1.5 font-medium text-foreground">
              <span>Total{order.mode === "subscription" ? ` / ${order.interval}` : ""}</span>
              <span className="tabular-nums">{formatMoney(order.total, currency)}</span>
            </li>
          </ul>
        </SectionBlock>
      ) : null}
    </div>
  );
}

// --- Metadata ------------------------------------------------------------------

export function MetadataSection({ response, onOpenResponse }) {
  const m = response.metadata || {};
  const ua = m.userAgent || response.userAgent;
  const { device, browser, os } = parseUserAgent(ua);
  const utm = m.utm || {};
  const answered = Object.values(response.answers || {}).filter((v) => v != null && v !== "" && !(Array.isArray(v) && !v.length)).length;
  return (
    <div className="space-y-3">
      <SectionBlock title="Submission">
        <Rows
          items={[
            { label: "Submitted", value: formatDateTime(response.submittedAt) },
            { label: "Last edited", value: response.editedAt ? formatDateTime(response.editedAt) : "" },
            { label: "Completion time", value: response.completionMs != null ? formatDuration(response.completionMs) : "" },
            { label: "Answers", value: String(answered) },
            { label: "Score", value: response.score != null ? String(response.score) : "" },
            { label: "Quiz", value: m.quiz ? `${m.quiz.earned}/${m.quiz.possible} (${m.quiz.percent}%) · ${m.quiz.passed ? "Passed" : "Failed"}` : "" },
            { label: "Outcome", value: outcomeLabel(response.outcome) },
            { label: "A/B variant", value: m.variant || "" },
            { label: "Anonymous", value: m.anonymous ? "Yes" : "" },
            {
              label: "Possible duplicate of",
              value: m.duplicateOf ? (
                <Button type="button" variant="link" className="h-auto p-0 font-normal text-sky-400" onClick={() => onOpenResponse?.(m.duplicateOf)}>
                  #{String(m.duplicateOf).slice(0, 8)}
                </Button>
              ) : "",
            },
            { label: "Geiger Flow issue", value: m.flowIssue ? `#${m.flowIssue.number ?? String(m.flowIssue.id).slice(0, 8)}` : "" },
          ]}
        />
      </SectionBlock>
      <SectionBlock title="Source">
        <Rows
          items={[
            { label: "Device", value: device },
            { label: "Browser", value: browser },
            { label: "OS", value: os },
            { label: "Referrer", value: m.referrer || "" },
            { label: "UTM source", value: utm.source || "" },
            { label: "UTM medium", value: utm.medium || "" },
            { label: "UTM campaign", value: utm.campaign || "" },
            { label: "UTM term", value: utm.term || "" },
            { label: "UTM content", value: utm.content || "" },
            { label: "IP hash", value: m.ipHash ? <span className="font-mono">{String(m.ipHash).slice(0, 16)}…</span> : "" },
            { label: "Session", value: m.sessionId ? <span className="font-mono">{String(m.sessionId).slice(0, 12)}</span> : "" },
            { label: "User agent", value: ua || "" },
          ]}
        />
      </SectionBlock>
      {m.delegate || m.attestation || m.policy ? (
        <SectionBlock title="Declarations">
          <Rows
            items={[
              { label: "Submitted by", value: m.delegate ? `${m.delegate.byName || m.delegate.byEmail || "Delegate"} on behalf of ${m.delegate.forName || m.delegate.forEmail || "someone"}` : "" },
              { label: "Attestation", value: m.attestation ? `Accepted ${formatDateTime(m.attestation.acceptedAt)}` : "" },
              { label: "Attestation statement", value: m.attestation?.statement || "" },
              { label: "Policy acknowledged", value: m.policy ? formatDateTime(m.policy.acknowledgedAt) : "" },
              { label: "Typed name", value: m.policy?.typedName || "" },
              { label: "Read to end", value: m.policy ? (m.policy.scrolled ? "Yes" : "No") : "" },
            ]}
          />
        </SectionBlock>
      ) : null}
      {m.countersign ? (
        <SectionBlock title="Countersignature">
          <CountersignBlock response={response} />
        </SectionBlock>
      ) : null}
    </div>
  );
}

export function CountersignBlock({ response }) {
  const c = response.metadata?.countersign;
  if (!c) return null;
  const src = c.signature ? responseFileUrl(response.id, c.signature) : "";
  return (
    <div className="flex items-center gap-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={`Countersignature by ${c.name}`} className="h-14 w-32 rounded-md border border-border bg-white object-contain p-1" />
      ) : null}
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-medium text-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />{c.name}</p>
        <p className="text-[10px] text-text-tertiary">Countersigned {formatDateTime(c.at)}</p>
      </div>
    </div>
  );
}

// --- Access log ----------------------------------------------------------------

const ACCESS_ICON = { view: Eye, reveal: ShieldCheck, export: FileDown, print: Printer, edit: Pencil, file: Download };

export function AccessLogSection({ response }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    listAccess({ responseId: response.id })
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [response.id]);

  if (!rows) return <Loading />;
  if (!rows.length) return <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-text-tertiary">No access recorded yet.</p>;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface-card">
      {rows.map((row) => {
        const Icon = ACCESS_ICON[row.action] || History;
        return (
          <li key={row.id} className="flex items-center gap-2.5 px-3 py-2">
            <Icon className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{row.actorName || "Unknown"}</span> {ACCESS_VERB[row.action] || row.action}
              {row.fieldId ? <span className="text-text-tertiary"> · {row.fieldId}</span> : null}
            </span>
            <span className="shrink-0 text-[10px] text-text-tertiary" title={formatDateTime(row.createdAt)}>{row.when}</span>
          </li>
        );
      })}
    </ul>
  );
}

const ACCESS_VERB = { view: "viewed", reveal: "revealed sensitive data", export: "exported", print: "printed", edit: "edited", file: "downloaded a file" };

// --- Activity & comments ---------------------------------------------------------

const ACTIVITY_LABEL = {
  "response.updated": "updated the response",
  "response.created": "submitted the response",
  "response.approved": "recorded an approval",
  "response.escalated": "escalated to Geiger Flow",
  "response.countersigned": "countersigned",
};

function describeActivity(a) {
  const d = a.detail || {};
  if (a.action === "response.updated") {
    const parts = [];
    if (d.status) parts.push(`set status to ${d.status}`);
    if (d.priority) parts.push(`set priority to ${d.priority}`);
    if ("assignee" in d) parts.push(d.assignee ? `assigned ${d.assignee}` : "cleared the assignee");
    if (Array.isArray(d.tags)) parts.push(d.tags.length ? `tagged ${d.tags.join(", ")}` : "cleared tags");
    if (parts.length) return parts.join(", ");
  }
  return ACTIVITY_LABEL[a.action] || a.action.replace(/[._]/g, " ");
}

export function ActivitySection({ response }) {
  const { comments, loading, add } = useComments(response.id);
  const [activity, setActivity] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let live = true;
    listActivity({ formId: response.formId, limit: 500 })
      .then((rows) => live && setActivity(rows.filter((a) => a.responseId === response.id)))
      .catch(() => live && setActivity([]));
    return () => {
      live = false;
    };
  }, [response.formId, response.id, response.updatedAt]);

  const timeline = useMemo(() => {
    const items = [
      { kind: "event", id: "submitted", at: response.submittedAt, actor: response.name, text: "submitted the form" },
      ...(activity || []).map((a) => ({ kind: "event", id: a.id, at: a.createdAt, actor: a.actorName, text: describeActivity(a) })),
      ...comments.map((c) => ({ kind: "comment", id: c.id, at: c.createdAt, actor: c.author, initials: c.initials, text: c.body, when: c.when })),
    ];
    return items.sort((a, b) => new Date(a.at) - new Date(b.at));
  }, [activity, comments, response.submittedAt, response.name]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await add(text);
      setInput("");
    } catch {
      toast.error("Couldn't post your comment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
        {loading || activity === null ? (
          <Loading />
        ) : (
          <ol className="space-y-4">
            {timeline.map((item) =>
              item.kind === "comment" ? (
                <li key={item.id} className="flex gap-3">
                  <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-muted-foreground", avatarColor(item.actor))}>
                    {item.initials}
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface-card px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{item.actor}</span>
                      <span className="text-[10px] text-text-tertiary">{item.when}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                  </div>
                </li>
              ) : (
                <li key={item.id} className="flex items-center gap-3 pl-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong" />
                  <p className="min-w-0 flex-1 text-[11px] text-text-secondary">
                    <span className="font-medium text-muted-foreground">{item.actor || "System"}</span> {item.text}
                  </p>
                  <span className="shrink-0 text-[10px] text-text-tertiary">{formatDateTime(item.at)}</span>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Add a comment for your team…"
            aria-label="Comment"
            className="h-8 flex-1 text-xs"
          />
          <Button type="button" size="sm" onClick={send} disabled={sending || !input.trim()} aria-label="Send comment" className="h-8 w-9 shrink-0 bg-primary p-0 text-primary-foreground hover:bg-primary/90">
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-text-tertiary">Enter to send · Visible to workspace members only</p>
      </div>
    </div>
  );
}
