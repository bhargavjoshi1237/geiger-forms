"use client";

import { useState } from "react";
import {
  Edit3,
  Send,
  X,
  Zap,
  FileSpreadsheet,
  Link2 as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useComments } from "@/lib/hooks/use-comments";

const PRIORITY_STYLE = {
  High: { bg: "bg-[#2a0808]", text: "text-[#f87171]", border: "border-[#7f1d1d]" },
  Medium: { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Low: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const STATUS_STYLE = {
  Complete: { bg: "bg-[#0d2218]", text: "text-[#4ade80]", border: "border-[#166534]" },
  "Needs review": { bg: "bg-[#2a1a08]", text: "text-[#fb923c]", border: "border-[#7c2d12]" },
  Pending: { bg: "bg-[#1c1917]", text: "text-[#78716c]", border: "border-[#44403c]" },
};

const AVATAR_COLORS = ["bg-[#0e1e2e]", "bg-[#0d2218]", "bg-[#2a1a08]", "bg-[#1a0d2e]", "bg-surface-subtle", "bg-[#0d1e1a]"];

function parseUserAgent(ua) {
  if (!ua) return { device: "Unknown", browser: "Unknown", os: "Unknown" };

  const device = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : "Desktop";

  let browser = "Unknown";
  if (/Edg/.test(ua)) browser = "Edge";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";
  else if (/Chrome/.test(ua)) browser = "Chrome";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua)) browser = "Safari";

  let os = "Unknown";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS|Macintosh/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { device, browser, os };
}

function formatCompletion(ms) {
  if (ms == null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatSubmittedAt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isNonEmpty(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return String(value) !== "";
}

function deriveFields(response) {
  if (response.fields) {
    return Object.entries(response.fields).map(([label, value]) => ({ label, value }));
  }
  if (response.answers) {
    const derived = Object.entries(response.answers)
      .filter(([, value]) => isNonEmpty(value))
      .map(([key, value]) => ({ label: key, value: String(value) }));
    if (derived.length > 0) return derived;
  }
  return [
    { label: "Name", value: response.name },
    { label: "Email", value: response.email },
    { label: "Form", value: response.form },
  ];
}

function AnalyticsRow({ label, value }) {
  return (
    <>
      <dt className="text-[11px] text-text-tertiary">{label}</dt>
      <dd className="text-[11px] text-muted-foreground text-right">{value}</dd>
    </>
  );
}

function AnalyticsSection({ title, children }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="mb-2.5 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">{title}</p>
      {children}
    </div>
  );
}

function AnalyticsTab({ response }) {
  const [sheetUrl, setSheetUrl] = useState("");
  const [showSheetInput, setShowSheetInput] = useState(false);
  const [pendingUrl, setPendingUrl] = useState("");

  const { device, browser, os } = parseUserAgent(response.userAgent);

  const answeredCount = response.answers
    ? Object.values(response.answers).filter(isNonEmpty).length
    : 0;
  const totalFields = response.fields ? Object.keys(response.fields).length : answeredCount;

  const confirmSheet = () => {
    const trimmed = pendingUrl.trim();
    if (!trimmed) return;
    setSheetUrl(trimmed);
    setPendingUrl("");
    setShowSheetInput(false);
  };

  return (
    <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
      <div className="space-y-3">

        <AnalyticsSection title="Submitter">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <AnalyticsRow label="Device" value={device} />
            <AnalyticsRow label="Browser" value={browser} />
            <AnalyticsRow label="OS" value={os} />
          </dl>
        </AnalyticsSection>

        <AnalyticsSection title="Submission">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <AnalyticsRow label="Submitted at" value={formatSubmittedAt(response.submittedAt)} />
            <AnalyticsRow label="Completion time" value={formatCompletion(response.completionMs)} />
            <AnalyticsRow label="Fields answered" value={`${answeredCount} / ${totalFields}`} />
            {response.score != null && (
              <AnalyticsRow label="Score" value={response.score} />
            )}
          </dl>
        </AnalyticsSection>

        <AnalyticsSection title="Connected sheet">
          {sheetUrl ? (
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-subtle px-3 py-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#4ade80]" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={sheetUrl}>
                {sheetUrl}
              </span>
              <button
                type="button"
                onClick={() => { setSheetUrl(""); setShowSheetInput(false); setPendingUrl(""); }}
                className="shrink-0 text-text-tertiary transition-colors hover:text-muted-foreground"
                aria-label="Unlink sheet"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSheetInput(false); }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-surface-subtle px-3 py-2 text-[11px] text-text-secondary transition-colors hover:border-border-strong hover:text-muted-foreground"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Geiger-Office Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetInput((v) => !v)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[11px] transition-colors",
                    showSheetInput
                      ? "border-border-strong bg-surface-card text-muted-foreground"
                      : "border-border bg-surface-subtle text-text-secondary hover:border-border-strong hover:text-muted-foreground",
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Google Sheet
                </button>
              </div>

              {showSheetInput && (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={pendingUrl}
                    onChange={(e) => setPendingUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") confirmSheet(); if (e.key === "Escape") setShowSheetInput(false); }}
                    placeholder="Paste Google Sheet URL..."
                    className="h-8 flex-1 text-[11px] text-muted-foreground"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={confirmSheet}
                    className="h-8 shrink-0 px-3 text-[11px]"
                  >
                    Link
                  </Button>
                </div>
              )}
            </div>
          )}
        </AnalyticsSection>

      </div>
    </div>
  );
}

export function ResponseDetailPanel({ response, index, onClose, score, priority }) {
  const [status, setStatus] = useState(response.status);
  const { comments, loading: commentsLoading, add } = useComments(response.id);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("response");

  const fields = deriveFields(response);

  const currentStyle = STATUS_STYLE[status] ?? STATUS_STYLE.Pending;
  const priorityStyle = priority ? PRIORITY_STYLE[priority] : null;

  const addComment = async () => {
    const text = input.trim();
    if (!text) return;
    await add(text);
    setInput("");
  };

  const TABS = [
    { id: "response", label: "Response" },
    { id: "analytics", label: "Analytics" },
    { id: "thread", label: "Thread" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="flex-1 bg-black/50"
        onClick={onClose}
        aria-label="Close panel"
      />

      <aside className="flex h-full w-full max-w-[460px] flex-col border-l border-border bg-surface-subtle shadow-2xl">

        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground",
              AVATAR_COLORS[index % AVATAR_COLORS.length],
            )}
          >
            {response.initials}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-white">{response.name}</p>
            <p className="text-xs text-text-tertiary">{response.email}</p>
            <p className="mt-0.5 text-[10px] text-text-tertiary">
              {response.form}&nbsp;·&nbsp;{response.received}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {priorityStyle && (
              <span
                className={cn(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  priorityStyle.bg,
                  priorityStyle.text,
                  priorityStyle.border,
                )}
              >
                <Zap className="h-2.5 w-2.5" />
                {priority}
              </span>
            )}

            {score != null && (
              <span
                className="rounded bg-surface-card px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground"
                title="Triage score"
              >
                {score}
              </span>
            )}

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                className={cn(
                  "h-6 w-auto gap-1 rounded-full border px-2 text-[10px] font-medium [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-60",
                  currentStyle.bg,
                  currentStyle.text,
                  currentStyle.border,
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STATUS_STYLE).map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-active hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-border">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex-1 py-2.5 text-xs font-medium transition-colors",
                activeTab === id
                  ? "border-b-2 border-white text-white"
                  : "text-text-secondary hover:text-muted-foreground",
              )}
            >
              {label}
              {id === "thread" && comments.length > 0 && (
                <span className="ml-1.5 rounded-full bg-surface-hover px-1.5 text-[10px] text-muted-foreground">
                  {comments.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "response" && (
          <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
            <div className="space-y-0.5">
              {fields.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-md px-3 py-2.5 transition-colors hover:bg-surface-card"
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-surface-active pt-4">
              <p className="text-[10px] text-text-tertiary">
                Submitted {response.received}&nbsp;·&nbsp;Internal ID #{String(response.id).slice(0, 8)}
              </p>
              <button
                type="button"
                className="mt-2 flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-foreground"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Request edit from respondent
              </button>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <AnalyticsTab response={response} />
        )}

        {activeTab === "thread" && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="scrollbar-subtle flex-1 overflow-y-auto p-4">
              {commentsLoading ? (
                <div className="flex min-h-24 items-center justify-center text-center">
                  <p className="text-xs text-text-tertiary">Loading comments…</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="flex min-h-24 items-center justify-center text-center">
                  <p className="text-xs text-text-tertiary">No comments yet. Start the review thread below.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {comments.map((c, i) => (
                    <div key={c.id} className="flex gap-3">
                      <div
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-muted-foreground",
                          AVATAR_COLORS[i % AVATAR_COLORS.length],
                        )}
                      >
                        {c.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-foreground">{c.author}</span>
                          <span className="text-[10px] text-text-tertiary">{c.when}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border p-3">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="h-8 flex-1 text-xs text-muted-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={addComment}
                  className="h-9 w-9 shrink-0 p-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-1.5 text-[10px] text-text-tertiary">
                Enter to send&nbsp;·&nbsp;Visible to workspace members only
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
